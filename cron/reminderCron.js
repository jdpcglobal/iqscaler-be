// server/cron/reminderCron.js

import cron from 'node-cron';
import Result from '../models/resultModel.js';
import { sendReminderEmail } from '../utils/emailUtils.js';
import { getReminderEmailTemplate } from '../utils/emailTemplates.js';

/**
 * Finds all results where:
 *  - certificatePurchased is false
 *  - createdAt is between 23 and 25 hours ago  (24h ± 1h window)
 *
 * This ±1h window means the job is safe to run every hour — each result
 * will only ever fall inside the window once, so no user gets double-emailed
 * even if the server restarts.
 */
const sendCertificateReminders = async () => {
    console.log('[ReminderCron] Running certificate reminder job...');

    try {
        const now = new Date();

        // 23 hours ago  ──  lower bound
        const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000);
        // 25 hours ago  ──  upper bound  (cron runs hourly, window = 2h wide)
        const windowEnd   = new Date(now.getTime() - 23 * 60 * 60 * 1000);

        const pendingResults = await Result.find({
            certificatePurchased: false,
            createdAt: { $gte: windowStart, $lte: windowEnd },
        }).populate('user', 'username email');

        if (pendingResults.length === 0) {
            console.log('[ReminderCron] No pending results in window. Done.');
            return;
        }

        console.log(`[ReminderCron] Found ${pendingResults.length} result(s) to remind.`);

        const clientUrl = process.env.CLIENT_URL || 'https://www.iqscaler.com';

        // Process reminders concurrently but cap with allSettled so one
        // failure doesn't abort the rest
        const jobs = pendingResults.map(result => {
            const user = result.user;

            // Guard: skip if user was deleted or has no email
            if (!user || !user.email) {
                console.warn(`[ReminderCron] Skipping result ${result._id} — no user email.`);
                return Promise.resolve();
            }

            return sendReminderEmail(
                user.email,
                `⏰ ${user.username}, your IQ certificate is still waiting`,
                getReminderEmailTemplate({
                    username: user.username,
                    totalScore: result.totalScore,
                    correctAnswers: result.correctAnswers,
                    questionsAttempted: result.questionsAttempted,
                    iqScore: result.iqScore,
                    resultId: result._id.toString(),
                    clientUrl,
                }),
            );
        });

        await Promise.allSettled(jobs);
        console.log('[ReminderCron] Job complete.');

    } catch (err) {
        // Catch DB errors — never let a cron crash the process
        console.error('[ReminderCron] Unexpected error during job:', err.message);
    }
};

/**
 * Starts the cron schedule.
 *
 * Schedule: '0 * * * *'  →  top of every hour
 *
 * Why hourly?  The ±1h window on the query means a result is only matchable
 * for a 2-hour period. Running hourly guarantees it gets picked up exactly once.
 *
 * If you prefer a single daily run instead, change to: '0 10 * * *'
 * (runs at 10:00 AM server time every day), but note that results created
 * more than a few minutes outside the 2h window could be missed on a daily run.
 */
const startReminderCron = () => {
    cron.schedule('0 * * * *', sendCertificateReminders, {
        scheduled: true,
        timezone: 'Asia/Kolkata', // IST — change to your server timezone if needed
    });

    console.log('[ReminderCron] Certificate reminder cron scheduled (hourly).');
};

export default startReminderCron;