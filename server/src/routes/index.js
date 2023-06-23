import { Router } from "express";

import Contract from "../models/Contract.js";
import Participant from "../models/Participant.js";

const router = Router();

router.get("", (req, res) => {
  res.send("Hello World");
});

router.get("/test", async (req, res) => {
  // deletes all contracts and participants
  await Contract.query().delete();
  await Participant.query().delete();

  // adds a participant
  const participant = await Participant.query().insert({
    participant_name: "consumer1",
  });

  // queries for all participants
  const participants = await Participant.query();

  // should log 1 participant
  console.log("participant : ", participants);

  // adds a contract for participant
  const contract1 = await Participant.relatedQuery("contracts")
    .for(participant.participant_id)
    .insert({ contract: {}, contract_type: "consumer" });

  // adds another contract for participant
  const contract2 = await Participant.relatedQuery("contracts")
    .for(participant.participant_id)
    .insert({ contract: {}, contract_type: "provider" });

  // queries for all contract types of participant
  const contractTypes = await Contract.query()
    .select("contract_type")
    .where("participant_id", "=", participant.participant_id);

  // should log 2 contract types
  console.log("contract types for participant : ", contractTypes);

  const result = {
    participants,
    contractTypes,
  };
  res.json(result);
});

export default router;