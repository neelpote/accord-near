import {test} from "node:test";
import assert from "node:assert/strict";
import {changes} from "./incidents.js";
import type {Snapshot} from "./operations.js";
const key=(allowance:string|null)=>({public_key:"key",permission:{FunctionCall:{receiver_id:"app.testnet",method_names:["charge"],allowance}}});
const snap=(code="a",keys=[key("100")]):Snapshot=>({block_height:1,block_hash:"hash",observed_at:new Date().toISOString(),accounts:[{account_id:"app.testnet",code_hash:code,keys}]});
test("incidents ignore gas allowance consumption but identify code and authority changes",()=>{
 assert.equal(changes(snap(),snap()).length,0);
 assert.equal(changes(snap(),snap("a",[key("90")])).length,0);
 assert.equal(changes(snap(),snap("a",[key(null)]))[0]!.type,"key_permission_changed");
 const increase=changes(snap(),snap("a",[key("200")]));assert.equal(increase.length,1);
 assert.equal(increase[0]!.fingerprint,changes(snap(),snap("a",[key("190")]))[0]!.fingerprint);
 assert.equal(changes(snap(),snap("b"))[0]!.type,"code_changed");
 assert.equal(changes(snap(),snap("a",[]))[0]!.type,"key_removed");
 assert.equal(changes(snap("a",[]),snap())[0]!.type,"key_added");
 assert.throws(()=>changes(snap(),{...snap(),accounts:[]}));
});
