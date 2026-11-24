import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipesPageUrl = pathToFileURL(path.join(projectRoot, "recipes.html")).href;
const viewports = [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 },
];

for (const viewport of viewports) {
    test(`recipe editor fields do not overlap on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.route(/^https?:\/\//, (route) => route.abort());
        await page.goto(recipesPageUrl);

        const editor = page.locator("#recipe-editor");
        await expect(editor).toBeHidden();
        await expect(page.locator("#sign-in-form")).toBeVisible();
        await editor.evaluate((element) => {
            element.hidden = false;
        });
        await expect(editor).toBeVisible();

        const fields = await page.locator(".recipe-form-grid > label").evaluateAll((labels) => {
            return labels.map((label) => {
                const control = label.querySelector("input, textarea");
                const labelBounds = label.getBoundingClientRect();
                const controlBounds = control.getBoundingClientRect();

                return {
                    label: label.textContent.trim(),
                    left: controlBounds.left,
                    right: controlBounds.right,
                    top: controlBounds.top,
                    bottom: controlBounds.bottom,
                    labelLeft: labelBounds.left,
                    labelRight: labelBounds.right,
                };
            });
        });

        expect(fields).toHaveLength(7);
        for (const field of fields) {
            expect(field.left, `${field.label} extends beyond its column on the left`).toBeGreaterThanOrEqual(field.labelLeft - 1);
            expect(field.right, `${field.label} extends beyond its column on the right`).toBeLessThanOrEqual(field.labelRight + 1);
        }

        for (let firstIndex = 0; firstIndex < fields.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < fields.length; secondIndex += 1) {
                const first = fields[firstIndex];
                const second = fields[secondIndex];
                const overlapsHorizontally = first.left < second.right && first.right > second.left;
                const overlapsVertically = first.top < second.bottom && first.bottom > second.top;

                expect(
                    overlapsHorizontally && overlapsVertically,
                    `${first.label} overlaps ${second.label} on ${viewport.name}`,
                ).toBe(false);
            }
        }
    });
}
