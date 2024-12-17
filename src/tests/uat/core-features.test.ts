import { test, expect } from '@playwright/test';

/**
 * UAT Test Suite: Core Features
 * These tests simulate real user interactions with core task management features
 */

test.describe('Task Management Core Features', () => {
    test.beforeEach(async ({ page }) => {
        // Setup: Login and navigate to dashboard
        await page.goto('/dashboard');
        // Add login steps here once auth is implemented
    });

    test('Create a new task with basic details', async ({ page }) => {
        await test.step('Navigate to task creation', async () => {
            await page.click('[data-testid="new-task-button"]');
            await expect(page.locator('[data-testid="task-form"]')).toBeVisible();
        });

        await test.step('Fill task details', async () => {
            await page.fill('[data-testid="task-title"]', 'Complete project presentation');
            await page.fill('[data-testid="task-description"]', 'Prepare and finalize Q4 project presentation');
            await page.click('[data-testid="save-task"]');
        });

        await test.step('Verify task creation', async () => {
            await expect(page.locator('text=Complete project presentation')).toBeVisible();
        });
    });

    test('Task should show cognitive load assessment', async ({ page }) => {
        await test.step('Open task details', async () => {
            await page.click('text=Complete project presentation');
        });

        await test.step('Verify cognitive load elements', async () => {
            await expect(page.locator('[data-testid="cognitive-load-indicator"]')).toBeVisible();
            await expect(page.locator('[data-testid="energy-level-gauge"]')).toBeVisible();
        });
    });

    test('Break task into smaller subtasks', async ({ page }) => {
        await test.step('Access task breakdown', async () => {
            await page.click('[data-testid="breakdown-button"]');
        });

        await test.step('Verify AI suggestions', async () => {
            await expect(page.locator('[data-testid="ai-suggestions"]')).toBeVisible();
            await expect(page.locator('[data-testid="subtasks-list"]')).toBeVisible();
        });
    });

    test('Track task progress', async ({ page }) => {
        await test.step('Update task progress', async () => {
            await page.click('[data-testid="progress-slider"]');
            await page.fill('[data-testid="progress-input"]', '50');
        });

        await test.step('Verify progress update', async () => {
            await expect(page.locator('[data-testid="progress-value"]')).toHaveText('50%');
        });
    });
});

test.describe('Analytics Features', () => {
    test('View personal analytics dashboard', async ({ page }) => {
        await test.step('Navigate to analytics', async () => {
            await page.click('[data-testid="analytics-nav"]');
        });

        await test.step('Verify dashboard components', async () => {
            await expect(page.locator('[data-testid="completion-chart"]')).toBeVisible();
            await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
            await expect(page.locator('[data-testid="insights-panel"]')).toBeVisible();
        });
    });
});

test.describe('Collaboration Features', () => {
    test('Share task with accountability partner', async ({ page }) => {
        await test.step('Open sharing dialog', async () => {
            await page.click('[data-testid="share-task-button"]');
        });

        await test.step('Share with partner', async () => {
            await page.fill('[data-testid="partner-email"]', 'partner@example.com');
            await page.click('[data-testid="send-invite"]');
        });

        await test.step('Verify sharing confirmation', async () => {
            await expect(page.locator('text=Task shared successfully')).toBeVisible();
        });
    });
});
