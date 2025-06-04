import { MavenAGIClient } from 'mavenagi';
import { Insightly } from 'insightlyjs';

export default {
  async preInstall({ settings }: { settings: AppSettings }) {
    const client = new Insightly(settings.apiKey);
    await client.get('Users');
  },

  async postInstall({ organizationId, agentId, settings }: { organizationId: string; agentId: string; settings: AppSettings }) {
    const mavenAgi = new MavenAGIClient({ organizationId, agentId });
    const client = new Insightly(settings.apiKey);

    await mavenAgi.actions.createOrUpdate({
      actionId: { referenceId: 'get-contact' },
      name: 'Get Insightly Contact',
      description: 'Retrieves a contact from Insightly',
      userInteractionRequired: false,
      userFormParameters: [],
      precondition: { preconditionType: 'user', key: 'insightlyId' },
    });

    const contacts = await client.get('Contacts', { top: 3 });
    for (const contact of contacts) {
      if (contact.EMAIL_ADDRESS) {
        await mavenAgi.users.createOrUpdate({
          userId: { referenceId: contact.CONTACT_ID.toString() },
          identifiers: [{ type: 'EMAIL', value: contact.EMAIL_ADDRESS }],
          data: {
            name: { value: contact.FIRST_NAME || '', visibility: 'VISIBLE' },
            insightlyId: { value: contact.CONTACT_ID.toString(), visibility: 'PARTIALLY_VISIBLE' },
          },
        });
      }
    }
  },

  async executeAction({ actionId, user, settings }: { actionId: string; user: any; settings: AppSettings }) {
    const client = new Insightly(settings.apiKey);
    const id = user.defaultUserData.insightlyId;
    if (actionId === 'get-contact') {
      const resp = await client.get(`Contacts/${id}`);
      return JSON.stringify(resp);
    }
  },
};
