import { MavenAGIClient } from 'mavenagi';
import axios from 'axios';

function getClient(settings: AppSettings) {
  return axios.create({
    baseURL: settings.baseUrl,
    headers: { Authorization: `Bearer ${settings.token}` },
  });
}

export default {
  async preInstall({ settings }: { settings: AppSettings }) {
    const client = getClient(settings);
    await client.get('/crmRestApi/resources/latest/contacts?limit=1');
  },

  async postInstall({ organizationId, agentId, settings }: { organizationId: string; agentId: string; settings: AppSettings }) {
    const mavenAgi = new MavenAGIClient({ organizationId, agentId });
    const client = getClient(settings);

    await mavenAgi.actions.createOrUpdate({
      actionId: { referenceId: 'get-contact' },
      name: 'Get Oracle CX Contact',
      description: 'Retrieves a contact from Oracle CX Cloud',
      userInteractionRequired: false,
      userFormParameters: [],
      precondition: { preconditionType: 'user', key: 'oracleId' },
    });

    const resp = await client.get('/crmRestApi/resources/latest/contacts?limit=3');
    for (const contact of resp.data.items || []) {
      if (contact.EmailAddress) {
        await mavenAgi.users.createOrUpdate({
          userId: { referenceId: contact.PartyId },
          identifiers: [{ type: 'EMAIL', value: contact.EmailAddress }],
          data: {
            name: { value: contact.PartyName || '', visibility: 'VISIBLE' },
            oracleId: { value: contact.PartyId, visibility: 'PARTIALLY_VISIBLE' },
          },
        });
      }
    }
  },

  async executeAction({ actionId, user, settings }: { actionId: string; user: any; settings: AppSettings }) {
    const client = getClient(settings);
    const id = user.defaultUserData.oracleId;
    if (actionId === 'get-contact') {
      const resp = await client.get(`/crmRestApi/resources/latest/contacts/${id}`);
      return JSON.stringify(resp.data);
    }
  },
};
