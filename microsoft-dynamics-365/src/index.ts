import { MavenAGIClient } from 'mavenagi';
import DynamicsWebApi from 'dynamics-web-api';

export default {
  async preInstall({ settings }: { settings: AppSettings }) {
    const dynamics = new DynamicsWebApi({ webApiUrl: settings.url, accessToken: settings.token });
    await dynamics.executeUnboundFunction('WhoAmI');
  },

  async postInstall({ organizationId, agentId, settings }: { organizationId: string; agentId: string; settings: AppSettings }) {
    const mavenAgi = new MavenAGIClient({ organizationId, agentId });
    const dynamics = new DynamicsWebApi({ webApiUrl: settings.url, accessToken: settings.token });

    await mavenAgi.actions.createOrUpdate({
      actionId: { referenceId: 'get-contact' },
      name: 'Get Dynamics Contact',
      description: 'Retrieves a contact from Dynamics 365',
      userInteractionRequired: false,
      userFormParameters: [],
      precondition: { preconditionType: 'user', key: 'dynamicsId' },
    });

    const result = await dynamics.retrieveMultiple('contacts', { top: 3 });
    const contacts = result.value || result;
    for (const contact of contacts) {
      if (contact.emailaddress1) {
        await mavenAgi.users.createOrUpdate({
          userId: { referenceId: contact.contactid },
          identifiers: [{ type: 'EMAIL', value: contact.emailaddress1 }],
          data: {
            name: { value: contact.fullname || '', visibility: 'VISIBLE' },
            dynamicsId: { value: contact.contactid, visibility: 'PARTIALLY_VISIBLE' },
          },
        });
      }
    }
  },

  async executeAction({ actionId, user, settings }: { actionId: string; user: any; settings: AppSettings }) {
    const dynamics = new DynamicsWebApi({ webApiUrl: settings.url, accessToken: settings.token });
    const contactId = user.defaultUserData.dynamicsId;
    if (actionId === 'get-contact') {
      return JSON.stringify(await dynamics.retrieve('contacts', contactId));
    }
  },
};
