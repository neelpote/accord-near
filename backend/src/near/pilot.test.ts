import {test} from "node:test";
import assert from "node:assert/strict";
import {pilotFeedback, pilotSummary} from "./pilot.js";
test("pilot feedback records a concrete need without manufacturing validation or revenue",()=>{
 const v={role:"developer",stage:"used",problem:"Missed code change",workaround:"Manual script",outcome:"Investigated a change"};
 assert.equal(pilotFeedback(v).terms,"");
 assert.throws(()=>pilotFeedback({...v,problem:" "}));
 assert.throws(()=>pilotFeedback({...v,stage:"accepted_terms"}));
 const accepted=pilotFeedback({...v,stage:"accepted_terms",terms:"2 NEAR for one month, trial only"});
 assert.equal(pilotSummary([{body:accepted}]).accepted_terms,1);
 assert.equal(pilotSummary([{body:accepted}]).demand_validated,false);
 assert.throws(()=>pilotFeedback({...v,role:"token-holder"}));
});
