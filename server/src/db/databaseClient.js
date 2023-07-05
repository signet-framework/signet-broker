import ConsumerContract from "../models/ConsumerContract.js";
import ProviderSpec from "../models/ProviderSpec.js";
import VersionSpec from "../models/VersionSpec.js";
import Participant from "../models/Participant.js";
import ParticipantVersion from "../models/ParticipantVersion.js";
import Integration from "../models/Integration.js";
import VersionContract from "../models/VersionContract.js";
import Environment from '../models/Environment.js';
import objectHash from "object-hash";
import {
  findOrCreate,
  findAndUpdateOrCreate,
  fmtJG,
} from "../utils/queryHelpers.js";

class DatabaseClient {
  async getParticipant(participantName) {
    return await findOrCreate(Participant, { participantName });
  }

  async participantVersionExists(participantId, participantVersion) {
    return !!(await ParticipantVersion.query().findOne({
      participantId,
      participantVersion,
    }));
  }

  async publishConsumerContract(
    contract,
    participantId,
    participantVersion,
    participantBranch
  ) {
    const { participantVersionId } = await findOrCreate(
      ParticipantVersion,
      { participantId, participantVersion },
      { participantId, participantVersion, participantBranch }
    );

    const contractHash = objectHash.MD5(contract);

    const providerId = (
      await findOrCreate(Participant, {
        participantName: contract.provider.name,
      })
    ).participantId;

    const integrationId = (
      await findOrCreate(Integration, {
        consumerId: participantId,
        providerId,
      })
    ).integrationId;

    const contractRecord = await findOrCreate(
      ConsumerContract,
      { contractHash, consumerId: participantId },
      {
        consumerId: participantId,
        integrationId,
        contract: {
          contractText: contract,
        },
        contractFormat: "json",
        contractHash,
      }
    );

    await VersionContract.query().insert({
      consumerContractId: contractRecord.consumerContractId,
      consumerVersionId: participantVersionId,
    });

    return contractRecord;
  }

  async publishProviderSpec(
    spec,
    providerId,
    specFormat,
    providerVersion,
    providerBranch
  ) {
    const specHash = objectHash.MD5(spec);

    const specRecord = await findOrCreate(
      ProviderSpec,
      { specHash, providerId },
      {
        spec: {
          specText: spec,
        },
        specFormat,
        specHash,
        providerId,
      }
    );

    if (providerVersion) {
      const { participantVersionId } = await findAndUpdateOrCreate(
        ParticipantVersion,
        {
          participantId: providerId,
          participantVersion: providerVersion,
        },
        {
          participantId: providerId,
          participantVersion: providerVersion,
          participantBranch: providerBranch,
        }
      );

      console.log("participantVersionId: ", participantVersionId);

      await findOrCreate(VersionSpec, {
        providerSpecId: specRecord.providerSpecId,
        providerVersionId: participantVersionId,
      });
    }

    return specRecord;
  }

  async getIntegrationData() {
    const joinGraph = ["consumer", "provider"];

    const integrations = await Integration.query().withGraphJoined(
      fmtJG(joinGraph)
    );

    return integrations;
  }

  async getIntegrationById(id) {
    const joinGraph = [
      "consumer",
      "provider",
      "comparisons.[consumerContract.consumerVersions, providerSpec.providerVersions]",
    ];
    const integrationById = await Integration.query()
      .findById(Number(id))
      .withGraphJoined(fmtJG(joinGraph));

    return integrationById;
  }

  async deleteIntegration(id) {
    const integration = await Integration.query().deleteById(Number(id));

    return integration;
  }

  async getConsumerContract(consumerContractId) {
    return await ConsumerContract.query().findById(consumerContractId);
  }

  async getProviderId(participantName) {
    return (await Participant.query().findOne({ participantName }))
      .participantId;
  }

  async getIntegration(consumerId, providerId) {
    return await Integration.query().findOne({ consumerId, providerId });
  }

  async getProviderSpecs(providerId) {
    return await ProviderSpec.query().where({ providerId });
  }

  async getProviderSpec(providerSpecId) {
    return await ProviderSpec.query().findById(providerSpecId);
  }

  async getIntegrationsByProviderId(providerId) {
    return await Integration.query().where({ providerId });
  }

  async getConsumerContractsByIntegrationId(integrationId) {
    return await ConsumerContract.query().where({ integrationId });
  }

  async createEnvironment(environmentName) {
    return await findOrCreate(
      Environment,
      { environmentName },
    );
  }
}

export default new DatabaseClient();
