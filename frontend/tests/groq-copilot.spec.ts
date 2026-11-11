import { test, expect } from "@playwright/test";
test("paid Groq example shows chain evidence and separate disclosed explanation", async ({ page }) => {
 test.skip(process.env.ACCORD_GROQ_SHOWCASE !== "1");
 await page.goto("/");
 const card=page.locator("article.service").filter({hasText:"Groq explains public chain evidence"});
 await expect(card).toBeVisible();
 await card.getByText("View paid example",{exact:false}).click();
 await expect(card.getByRole("heading",{name:"What to review next"})).toBeVisible();
 await expect(card.getByText(/No TEE attestation/)).toBeVisible();
 await expect(card.getByText(/Block hash:/)).toBeVisible();
 await page.screenshot({path:"../docs/demo/groq-copilot.png",fullPage:true});
});
