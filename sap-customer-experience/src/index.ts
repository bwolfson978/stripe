import { MavenAGIClient } from 'mavenagi';
import { BusinessPartnerApi } from '@sap/cloud-sdk-vdm-business-partner-service';
import { executeHttpRequest } from '@sap-cloud-sdk/http-client';

function getDestination(settings: AppSettings) {
  return { destinationName: settings.destinationName, jwt: settings.jwt };
}

export default {
  async preInstall({ settings }: { settings: AppSettings }) {
    await executeHttpRequest(getDestination(settings), { method: 'GET', url: '/' });
  },

  async postInstall({ organizationId, agentId, settings }: { organizationId: string; agentId: string; settings: AppSettings }) {
    const mavenAgi = new MavenAGIClient({ organizationId, agentId });
    const api = BusinessPartnerApi.getInstance();
    const destination = getDestination(settings);

    await mavenAgi.actions.createOrUpdate({
      actionId: { referenceId: 'get-business-partner' },
      name: 'Get SAP Business Partner',
      description: 'Retrieves a business partner from SAP CX',
      userInteractionRequired: false,
      userFormParameters: [],
      precondition: { preconditionType: 'user', key: 'sapId' },
    });

    const partners = await api.requestBuilder().getAll().top(3).execute(destination);
    for (const p of partners) {
      if (p.emailAddress) {
        await mavenAgi.users.createOrUpdate({
          userId: { referenceId: p.businessPartner },
          identifiers: [{ type: 'EMAIL', value: p.emailAddress }],
          data: {
            name: { value: p.lastName || '', visibility: 'VISIBLE' },
            sapId: { value: p.businessPartner, visibility: 'PARTIALLY_VISIBLE' },
          },
        });
      }
    }
  },

  async executeAction({ actionId, user, settings }: { actionId: string; user: any; settings: AppSettings }) {
    const api = BusinessPartnerApi.getInstance();
    const destination = getDestination(settings);
    const id = user.defaultUserData.sapId;
    if (actionId === 'get-business-partner') {
      return JSON.stringify(await api.requestBuilder().getByKey(id).execute(destination));
    }
  },
};
