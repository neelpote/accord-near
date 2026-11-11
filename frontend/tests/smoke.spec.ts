import { test, expect } from "@playwright/test";
test("marketplace renders real terms without horizontal overflow", async ({
  page,
}) => {
  const base = process.env.ACCORD_LIVE_BROWSER
    ? "http://localhost:3000"
    : "http://localhost:3100";
  if (!process.env.ACCORD_LIVE_BROWSER) {
    for (const path of ["agent-types", "agent-examples"])
      await page.route(`**/api/near/${path}`, (r) => r.fulfill({ json: [] }));
    // Presentation fixture only. Financial behavior is tested separately against WASM/testnet.
    await page.route("**/api/near/config", (r) =>
      r.fulfill({
        json: {
          network: "testnet",
          contract: "accord.testnet",
          rpc: "http://unused.invalid",
          recipient: "localhost:3100",
        },
      }),
    );
    await page.route("**/api/near/services", (r) => r.fulfill({ json: [] }));
    await page.route("**/api/near/me", (r) =>
      r.fulfill({ status: 401, json: { error: "Sign in" } }),
    );
  }
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: /Delegate the work/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in with NEAR" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("heading", { name: "My agreements" }),
  ).toBeVisible();
});

test("each agent listing opens its own input schema", async ({ page }) => {
  const templates = [
    {
      name: "Wallet Watch",
      kind: "near-wallet-watch-v1",
      input_label: "Wallet account and minimum reserve · JSON",
      input_example: {
        account_id: "demo.testnet",
        minimum_available_yocto: "50000000000000000000000",
      },
    },
    {
      name: "Access Guard",
      kind: "near-access-guard-v1",
      input_label: "Account and trusted contract · JSON",
      input_example: {
        account_id: "demo.testnet",
        trusted_contract_id: "accord.testnet",
      },
    },
    {
      name: "Contract Sentinel",
      kind: "near-contract-sentinel-v1",
      input_label: "Contract account and approved code hash · JSON",
      input_example: {
        account_id: "accord.testnet",
        expected_code_hash: "11111111111111111111111111111111",
      },
    },
    {
      name: "Receipt Inspector",
      kind: "near-receipt-inspector-v1",
      input_label: "Transaction hash and signer account · JSON",
      input_example: {
        signer_account_id: "demo.testnet",
        transaction_hash: "ANvufY2wASqigzqbHXRYuYj5YSXgycmMA6uQp4ti9Wap",
      },
    },
    {
      name: "Network Pulse",
      kind: "near-network-pulse-v1",
      input_label: "Maximum finalized-block age · JSON",
      input_example: { max_block_age_seconds: 60 },
    },
  ];
  // UI fixtures only; paid execution is separately verified by the real testnet demonstration.
  await page.route("**/api/near/config", (r) =>
    r.fulfill({
      json: {
        network: "testnet",
        contract: "accord.testnet",
        rpc: "http://unused.invalid",
        recipient: "localhost:3100",
      },
    }),
  );
  await page.route("**/api/near/agent-types", (r) =>
    r.fulfill({ json: templates }),
  );
  await page.route("**/api/near/agent-examples", (r) =>
    r.fulfill({ json: [] }),
  );
  await page.route("**/api/near/services", (r) =>
    r.fulfill({
      json: templates.map((t, i) => ({
        id: String(i),
        metadata: { ...t, description: "Presentation test fixture" },
      })),
    }),
  );
  await page.route("**/api/near/me", (r) =>
    r.fulfill({ json: { accountId: "demo.testnet" } }),
  );
  await page.route("**/api/near/subscriptions", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/near/balances", (r) =>
    r.fulfill({ json: { available: "0", earned: "0", pending: "0" } }),
  );
  await page.route("http://unused.invalid/", (r) => {
    const args = JSON.parse(
      atob(r.request().postDataJSON().params.args_base64),
    );
    const t = templates[Number(args.service_id)]!;
    r.fulfill({
      json: {
        result: {
          result: Array.from(
            new TextEncoder().encode(
              JSON.stringify({
                name: t.name,
                provider: "provider.testnet",
                price: "1000000000000000000000",
                interval_ns: "60000000000",
                metadata_hash: "a".repeat(64),
              }),
            ),
          ),
        },
      },
    });
  });
  await page.goto("http://localhost:3100");
  for (const template of templates) {
    await page
      .locator("article.service")
      .filter({
        has: page.getByRole("heading", { name: template.name, exact: true }),
      })
      .getByRole("button", { name: "Choose terms →" })
      .click();
    const field = page.getByRole("textbox", {
      name: template.input_label,
      exact: true,
    });
    await expect(field).toBeVisible();
    expect(JSON.parse(await field.inputValue())).toEqual(
      template.input_example,
    );
    await page.getByRole("button", { name: "Close", exact: true }).click();
  }
});

test("application onboarding requires review before baseline approval",async({page})=>{
 const snapshot={block_height:123,block_hash:"1".repeat(32),observed_at:new Date().toISOString(),accounts:[{account_id:"app.testnet",code_hash:"1".repeat(32),keys:[]}]};
 let workspace:any=null;let acknowledged=false;
 await page.route("**/api/near/**",async r=>{
 const path=new URL(r.request().url()).pathname.replace("/api/near","");
 let json:any=[];
 if(path==="/config")json={network:"testnet",contract:"accord.testnet",rpc:"http://unused.invalid",recipient:"localhost:3100"};
 if(path==="/me")json={accountId:"owner.testnet"};
 if(path==="/balances")json={available:"0",earned:"0",pending:"0"};
 if(path==="/pilot")json={records:[],summary:{demand_validated:false}};
 if(path==="/workspaces"){
  if(r.request().method()==="POST")workspace={id:"fixture",...r.request().postDataJSON(),baseline:null,pending_baseline:null,baseline_version:0,monitoring:false};
  json=r.request().method()==="POST"?workspace:(workspace?[workspace]:[]);
 }
 if(path.endsWith("/incidents")&&workspace?.baseline)json=[{id:"1",type:"code_changed",account_id:"app.testnet",state:"open",observations:2,occurrences:1,acknowledged_at:acknowledged?new Date().toISOString():null,first_seen:snapshot.observed_at,evidence:{change:{before:"old-code",after:"new-code"},baseline_block:snapshot.block_hash,observation:snapshot}}];
 if(path.endsWith("/events"))json={events:[],next_cursor:null};
 if(path==="/notification-config")json={webhook_available:false};
 if(path.endsWith("/monitoring")){workspace.monitoring=r.request().postDataJSON().enabled;json={saved:true};}
 if(path.endsWith("/explain"))json={title:"Incident review",summary:"Source block "+"a".repeat(64),status:"attention",metrics:[{label:"Account",value:"app.testnet"}],findings:[],recommendations:[],explanation:{provider:"groq",model:"fixture",summary:"Review hash "+"b".repeat(64),next_steps:["Compare deployment records"],disclosure:"Presentation fixture, not live inference"}};
 if(path.endsWith("/acknowledge")){acknowledged=true;json={acknowledged:true};}
 if(path.endsWith("/capture")){workspace.pending_baseline=snapshot;json={snapshot};}
 if(path.endsWith("/approve")){expect(r.request().postDataJSON().proposal_hash).toMatch(/^[a-f0-9]{64}$/);workspace.baseline=snapshot;workspace.pending_baseline=null;workspace.baseline_version=1;json={approved:true};}
 await r.fulfill({json});
 });
 await page.goto("http://localhost:3100");
 await page.getByRole("textbox",{name:"Application name",exact:true}).fill("Example application");
 await page.getByRole("textbox",{name:"Testnet account IDs",exact:true}).fill("app.testnet");
 await page.getByRole("button",{name:"Create read-only workspace"}).click();
 await expect(page.getByText("Baseline not approved",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:/I reviewed this snapshot/})).toHaveCount(0);
 await page.getByRole("button",{name:"Capture baseline for review"}).click();
 await expect(page.getByRole("heading",{name:"Review proposed baseline"})).toBeVisible();
 await page.getByRole("button",{name:/I reviewed this snapshot/}).click();
 await expect(page.getByText("Baseline 1",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Start read-only monitoring"}).click();
 await expect(page.getByRole("button",{name:"Pause monitoring"})).toBeVisible();
 await page.getByText("code changed · app.testnet · open",{exact:true}).click();
 await expect(page.getByText('"old-code"',{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Acknowledge incident"}).click();
 await expect(page.getByText(/code changed · app.testnet · open · acknowledged/)).toBeVisible();
 await page.getByRole("button",{name:"Explain incident with Groq"}).click();
 await expect(page.getByRole("heading",{name:"What to review next"})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
