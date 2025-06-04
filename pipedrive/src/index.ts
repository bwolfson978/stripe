import { MavenAGIClient } from 'mavenagi';
import { DealsApi, Configuration, PersonsApi } from 'pipedrive';

function getConfig(settings: AppSettings) {
  return new Configuration({ apiToken: settings.apiToken });
}

export default {
  async preInstall({ settings }: { settings: AppSettings }) {
    const persons = new PersonsApi(getConfig(settings));
    await persons.getPersons({ limit: 1 });
  },

  async postInstall({ organizationId, agentId, settings }: { organizationId: string; agentId: string; settings: AppSettings }) {
    const mavenAgi = new MavenAGIClient({ organizationId, agentId });
    const persons = new PersonsApi(getConfig(settings));

    await mavenAgi.actions.createOrUpdate({
      actionId: { referenceId: 'get-person' },
      name: 'Get Pipedrive Person',
      description: 'Retrieves a person from Pipedrive',
      userInteractionRequired: false,
      userFormParameters: [],
      precondition: { preconditionType: 'user', key: 'pipedriveId' },
    });

    const res = await persons.getPersons({ limit: 3 });
    for (const person of res.data) {
      if (person.email && person.email[0]) {
        await mavenAgi.users.createOrUpdate({
          userId: { referenceId: person.id.toString() },
          identifiers: [{ type: 'EMAIL', value: person.email[0].value }],
          data: {
            name: { value: person.name || '', visibility: 'VISIBLE' },
            pipedriveId: { value: person.id.toString(), visibility: 'PARTIALLY_VISIBLE' },
          },
        });
      }
    }
  },

  async executeAction({ actionId, user, settings }: { actionId: string; user: any; settings: AppSettings }) {
    const persons = new PersonsApi(getConfig(settings));
    const id = user.defaultUserData.pipedriveId;
    if (actionId === 'get-person') {
      const resp = await persons.getPerson(id);
      return JSON.stringify(resp.data);
    }
  },
};
