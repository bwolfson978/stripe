import { MavenAGIClient } from 'mavenagi';
import jsforce from 'jsforce';

export default {
  async preInstall({ settings }: { settings: AppSettings }) {
    const conn = new jsforce.Connection({ loginUrl: settings.loginUrl || 'https://login.salesforce.com' });
    await conn.login(settings.username, settings.password);
  },

  async postInstall({ organizationId, agentId, settings }: { organizationId: string; agentId: string; settings: AppSettings }) {
    const mavenAgi = new MavenAGIClient({ organizationId, agentId });
    const conn = new jsforce.Connection({ loginUrl: settings.loginUrl || 'https://login.salesforce.com' });
    await conn.login(settings.username, settings.password);

    await mavenAgi.actions.createOrUpdate({
      actionId: { referenceId: 'get-contact' },
      name: 'Get Salesforce Contact',
      description: 'Retrieves a contact from Salesforce',
      userInteractionRequired: false,
      userFormParameters: [],
      precondition: { preconditionType: 'user', key: 'salesforceId' },
    });

    const contacts = await conn.sobject('Contact').find().limit(3).execute();
    for (const contact of contacts) {
      if (contact.Email) {
        await mavenAgi.users.createOrUpdate({
          userId: { referenceId: contact.Id },
          identifiers: [{ type: 'EMAIL', value: contact.Email }],
          data: {
            name: { value: contact.Name || '', visibility: 'VISIBLE' },
            salesforceId: { value: contact.Id, visibility: 'PARTIALLY_VISIBLE' },
          },
        });
      }
    }
  },

  async executeAction({ actionId, user, settings }: { actionId: string; user: any; settings: AppSettings }) {
    const conn = new jsforce.Connection({ loginUrl: settings.loginUrl || 'https://login.salesforce.com' });
    await conn.login(settings.username, settings.password);
    const contactId = user.defaultUserData.salesforceId;

    if (actionId === 'get-contact') {
      return JSON.stringify(await conn.sobject('Contact').retrieve(contactId));
    }
  },
};
