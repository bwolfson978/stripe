import { MavenAGIClient } from 'mavenagi';
import * as ZOHOCRMSDK from '@zohocrm/nodejs-sdk-2.1';

async function initSDK(settings: AppSettings) {
  const environment = ZOHOCRMSDK.USDataCenter.PRODUCTION();
  const token = new ZOHOCRMSDK.OAuthBuilder()
    .clientId(settings.clientId)
    .clientSecret(settings.clientSecret)
    .refreshToken(settings.refreshToken)
    .redirectURL(settings.redirectUrl)
    .build();
  await ZOHOCRMSDK.InitializeBuilder.init({ environment, token });
}

export default {
  async preInstall({ settings }: { settings: AppSettings }) {
    await initSDK(settings);
    await ZOHOCRMSDK.ContactOperations.prototype.getContacts();
  },

  async postInstall({ organizationId, agentId, settings }: { organizationId: string; agentId: string; settings: AppSettings }) {
    const mavenAgi = new MavenAGIClient({ organizationId, agentId });
    await initSDK(settings);

    await mavenAgi.actions.createOrUpdate({
      actionId: { referenceId: 'get-contact' },
      name: 'Get Zoho Contact',
      description: 'Retrieves a contact from Zoho CRM',
      userInteractionRequired: false,
      userFormParameters: [],
      precondition: { preconditionType: 'user', key: 'zohoId' },
    });

    const response = await new ZOHOCRMSDK.ContactOperations().getContacts();
    const contacts = response.getObject()?.getContacts()?.slice(0, 3) || [];
    for (const contact of contacts) {
      const email = contact.getEmail();
      if (email) {
        await mavenAgi.users.createOrUpdate({
          userId: { referenceId: contact.getId().toString() },
          identifiers: [{ type: 'EMAIL', value: email }],
          data: {
            name: { value: contact.getFullName() || '', visibility: 'VISIBLE' },
            zohoId: { value: contact.getId().toString(), visibility: 'PARTIALLY_VISIBLE' },
          },
        });
      }
    }
  },

  async executeAction({ actionId, user, settings }: { actionId: string; user: any; settings: AppSettings }) {
    await initSDK(settings);
    const id = user.defaultUserData.zohoId;
    if (actionId === 'get-contact') {
      const resp = await new ZOHOCRMSDK.ContactOperations().getContact(id);
      return JSON.stringify(resp.getObject());
    }
  },
};
