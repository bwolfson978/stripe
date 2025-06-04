import { MavenAGIClient } from 'mavenagi';
import Freshsales from 'freshsales';

export default {
  async preInstall({ settings }: { settings: AppSettings }) {
    const client = new Freshsales({ apiKey: settings.apiKey, domain: settings.domain });
    await client.get('/api/contacts');
  },

  async postInstall({ organizationId, agentId, settings }: { organizationId: string; agentId: string; settings: AppSettings }) {
    const mavenAgi = new MavenAGIClient({ organizationId, agentId });
    const client = new Freshsales({ apiKey: settings.apiKey, domain: settings.domain });

    await mavenAgi.actions.createOrUpdate({
      actionId: { referenceId: 'get-contact' },
      name: 'Get Freshsales Contact',
      description: 'Retrieves a contact from Freshsales',
      userInteractionRequired: false,
      userFormParameters: [],
      precondition: { preconditionType: 'user', key: 'freshsalesId' },
    });

    const resp = await client.get('/api/contacts?per_page=3');
    for (const contact of resp.contacts || []) {
      if (contact.email) {
        await mavenAgi.users.createOrUpdate({
          userId: { referenceId: contact.id.toString() },
          identifiers: [{ type: 'EMAIL', value: contact.email }],
          data: {
            name: { value: contact.first_name || '', visibility: 'VISIBLE' },
            freshsalesId: { value: contact.id.toString(), visibility: 'PARTIALLY_VISIBLE' },
          },
        });
      }
    }
  },

  async executeAction({ actionId, user, settings }: { actionId: string; user: any; settings: AppSettings }) {
    const client = new Freshsales({ apiKey: settings.apiKey, domain: settings.domain });
    const id = user.defaultUserData.freshsalesId;
    if (actionId === 'get-contact') {
      const resp = await client.get(`/api/contacts/${id}`);
      return JSON.stringify(resp);
    }
  },
};
