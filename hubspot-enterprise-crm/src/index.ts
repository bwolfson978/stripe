import { MavenAGIClient } from 'mavenagi';
import { Client } from '@hubspot/api-client';

export default {
  async preInstall({ settings }: { settings: AppSettings }) {
    const hubspot = new Client({ apiKey: settings.apiKey });
    await hubspot.crm.contacts.basicApi.getPage(undefined, undefined, 1);
  },

  async postInstall({ organizationId, agentId, settings }: { organizationId: string; agentId: string; settings: AppSettings }) {
    const mavenAgi = new MavenAGIClient({ organizationId, agentId });
    const hubspot = new Client({ apiKey: settings.apiKey });

    await mavenAgi.actions.createOrUpdate({
      actionId: { referenceId: 'get-contact' },
      name: 'Get HubSpot Contact',
      description: 'Retrieves a contact from HubSpot',
      userInteractionRequired: false,
      userFormParameters: [],
      precondition: { preconditionType: 'user', key: 'hubspotId' },
    });

    const contacts = await hubspot.crm.contacts.basicApi.getPage(undefined, undefined, 3);
    for (const contact of contacts.results || []) {
      const email = contact.properties?.email;
      if (email) {
        await mavenAgi.users.createOrUpdate({
          userId: { referenceId: contact.id! },
          identifiers: [{ type: 'EMAIL', value: email }],
          data: {
            name: { value: contact.properties?.firstname || '', visibility: 'VISIBLE' },
            hubspotId: { value: contact.id!, visibility: 'PARTIALLY_VISIBLE' },
          },
        });
      }
    }
  },

  async executeAction({ actionId, user, settings }: { actionId: string; user: any; settings: AppSettings }) {
    const hubspot = new Client({ apiKey: settings.apiKey });
    const id = user.defaultUserData.hubspotId;
    if (actionId === 'get-contact') {
      const resp = await hubspot.crm.contacts.basicApi.getById(id);
      return JSON.stringify(resp.body);
    }
  },
};
