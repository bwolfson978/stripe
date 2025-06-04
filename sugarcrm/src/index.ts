import { MavenAGIClient } from 'mavenagi';
import { SugarClient } from '@sugarcrm/ventana';

function getClient(settings: AppSettings) {
  return new SugarClient({ baseUrl: settings.baseUrl, accessToken: settings.accessToken });
}

export default {
  async preInstall({ settings }: { settings: AppSettings }) {
    const client = getClient(settings);
    await client.me();
  },

  async postInstall({ organizationId, agentId, settings }: { organizationId: string; agentId: string; settings: AppSettings }) {
    const mavenAgi = new MavenAGIClient({ organizationId, agentId });
    const client = getClient(settings);

    await mavenAgi.actions.createOrUpdate({
      actionId: { referenceId: 'get-contact' },
      name: 'Get SugarCRM Contact',
      description: 'Retrieves a contact from SugarCRM',
      userInteractionRequired: false,
      userFormParameters: [],
      precondition: { preconditionType: 'user', key: 'sugarId' },
    });

    const resp = await client.call('get', '/rest/v11/Contacts', { params: { max_num: 3 } });
    for (const contact of resp.records || []) {
      if (contact.email1) {
        await mavenAgi.users.createOrUpdate({
          userId: { referenceId: contact.id },
          identifiers: [{ type: 'EMAIL', value: contact.email1 }],
          data: {
            name: { value: contact.full_name || '', visibility: 'VISIBLE' },
            sugarId: { value: contact.id, visibility: 'PARTIALLY_VISIBLE' },
          },
        });
      }
    }
  },

  async executeAction({ actionId, user, settings }: { actionId: string; user: any; settings: AppSettings }) {
    const client = getClient(settings);
    const id = user.defaultUserData.sugarId;
    if (actionId === 'get-contact') {
      const resp = await client.call('get', `/rest/v11/Contacts/${id}`);
      return JSON.stringify(resp);
    }
  },
};
