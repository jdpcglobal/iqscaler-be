// server/cron/reminderCron.js

import cron from 'node-cron';
import Result from '../models/resultModel.js';
import { sendReminderEmail } from '../utils/emailUtils.js';
import { getReminderEmailTemplate } from '../utils/emailTemplates.js';

/**
 * Two-layer guarantee that each result gets exactly one reminder email:
 *
 * Layer 1 — Time window (Option B, tightened):
 *   Catches results created between 23.5 and 24.5 hours ago (±30 min around
 *   the 24-hour mark). Since the cron runs hourly, any given result can only
 *   ever fall inside this 1-hour-wide window during a single run.
 *
 * Layer 2 — reminderSent flag (Option A):
 *   Even if a result somehow appears in two consecutive runs (e.g. the server
 *   was restarted mid-job), the flag ensures only the first run sends the
 *   email. The flag is set immediately after a successful send.
 *
 * Combined, the two layers make duplicate sends practically impossible.
 */
const sendCertificateReminders = async () => {
    console.log('[ReminderCron] Running certificate reminder job...');

    try {
        const now = new Date();

        // ±30 minutes around the 24-hour mark
        // Lower bound: 24h 30m ago
        const windowStart = new Date(now.getTime() - (24 * 60 + 30) * 60 * 1000);
        // Upper bound:  23h 30m ago
        const windowEnd   = new Date(now.getTime() - (23 * 60 + 30) * 60 * 1000);

        const pendingResults = await Result.find({
            certificatePurchased: false,  // only unpurchased certificates
            reminderSent: false,          // only unsent reminders (Option A guard)
            createdAt: { $gte: windowStart, $lte: windowEnd },
        }).populate('user', 'username email');

        if (pendingResults.length === 0) {
            console.log('[ReminderCron] No pending results in window. Done.');
            return;
        }

        console.log(`[ReminderCron] Found ${pendingResults.length} result(s) to remind.`);

        const clientUrl = process.env.CLIENT_URL || 'https://www.iqscaler.com';

        // Process all reminders concurrently; allSettled ensures one failure
        // doesn't abort the remaining sends
        const jobs = pendingResults.map(async (result) => {
            const user = result.user;

            // Guard: skip if user was deleted or has no email
            if (!user || !user.email) {
                console.warn(
                    `[ReminderCron] Skipping result ${result._id} — no user email.`
                );
                return;
            }

            try {
                // Send the reminder email
                await sendReminderEmail(
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

                // Mark as sent immediately after successful send (Option A guard)
                // Using findByIdAndUpdate rather than result.save() to avoid
                // triggering any pre-save hooks on the Result model
                await Result.findByIdAndUpdate(result._id, { reminderSent: true });

                console.log(
                    `[ReminderCron] Reminder sent → ${user.email} (result: ${result._id})`
                );

            } catch (err) {
                // Log but do NOT mark reminderSent — it will be retried next run
                console.error(
                    `[ReminderCron] Failed for ${user.email} (result: ${result._id}):`,
                    err.message
                );
            }
        });

        await Promise.allSettled(jobs);
        console.log('[ReminderCron] Job complete.');

    } catch (err) {
        // Catch DB-level errors — never let the cron crash the process
        console.error('[ReminderCron] Unexpected error during job:', err.message);
    }
};

/**
 * Starts the cron schedule.
 *
 * Schedule: '0 * * * *' → top of every hour
 *
 * The ±30 min window is exactly 1 hour wide, matching the cron interval.
 * This means each result can only ever appear in the window during one
 * single run, making Layer 1 alone almost sufficient. Layer 2 (reminderSent)
 * is the belt-and-suspenders safety net on top.
 */
const startReminderCron = () => {
    cron.schedule('0 * * * *', sendCertificateReminders, {
        scheduled: true,
        timezone: 'Asia/Kolkata', // IST — change to your server timezone if needed
    });

    console.log('[ReminderCron] Certificate reminder cron scheduled (hourly).');
};

export default startReminderCron;
// // server/cron/reminderCron.js

// import cron from 'node-cron';
// import Result from '../models/resultModel.js';
// import { sendReminderEmail } from '../utils/emailUtils.js';
// import { getReminderEmailTemplate } from '../utils/emailTemplates.js';

// /**
//  * Finds all results where:
//  *  - certificatePurchased is false
//  *  - createdAt is between 23 and 25 hours ago  (24h ± 1h window)
//  *
//  * This ±1h window means the job is safe to run every hour — each result
//  * will only ever fall inside the window once, so no user gets double-emailed
//  * even if the server restarts.
//  */
// const sendCertificateReminders = async () => {
//     console.log('[ReminderCron] Running certificate reminder job...');

//     try {
//         const now = new Date();

//         // 23 hours ago  ──  lower bound
//         const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000);
//         // 25 hours ago  ──  upper bound  (cron runs hourly, window = 2h wide)
//         const windowEnd   = new Date(now.getTime() - 23 * 60 * 60 * 1000);

//         const pendingResults = await Result.find({
//             certificatePurchased: false,
//             createdAt: { $gte: windowStart, $lte: windowEnd },
//         }).populate('user', 'username email');

//         if (pendingResults.length === 0) {
//             console.log('[ReminderCron] No pending results in window. Done.');
//             return;
//         }

//         console.log(`[ReminderCron] Found ${pendingResults.length} result(s) to remind.`);

//         const clientUrl = process.env.CLIENT_URL || 'https://www.iqscaler.com';

//         // Process reminders concurrently but cap with allSettled so one
//         // failure doesn't abort the rest
//         const jobs = pendingResults.map(result => {
//             const user = result.user;

//             // Guard: skip if user was deleted or has no email
//             if (!user || !user.email) {
//                 console.warn(`[ReminderCron] Skipping result ${result._id} — no user email.`);
//                 return Promise.resolve();
//             }

//             return sendReminderEmail(
//                 user.email,
//                 `⏰ ${user.username}, your IQ certificate is still waiting`,
//                 getReminderEmailTemplate({
//                     username: user.username,
//                     totalScore: result.totalScore,
//                     correctAnswers: result.correctAnswers,
//                     questionsAttempted: result.questionsAttempted,
//                     iqScore: result.iqScore,
//                     resultId: result._id.toString(),
//                     clientUrl,
//                 }),
//             );
//         });

//         await Promise.allSettled(jobs);
//         console.log('[ReminderCron] Job complete.');

//     } catch (err) {
//         // Catch DB errors — never let a cron crash the process
//         console.error('[ReminderCron] Unexpected error during job:', err.message);
//     }
// };

// /**
//  * Starts the cron schedule.
//  *
//  * Schedule: '0 * * * *'  →  top of every hour
//  *
//  * Why hourly?  The ±1h window on the query means a result is only matchable
//  * for a 2-hour period. Running hourly guarantees it gets picked up exactly once.
//  *
//  * If you prefer a single daily run instead, change to: '0 10 * * *'
//  * (runs at 10:00 AM server time every day), but note that results created
//  * more than a few minutes outside the 2h window could be missed on a daily run.
//  */
// const startReminderCron = () => {
//     cron.schedule('0 * * * *', sendCertificateReminders, {
//         scheduled: true,
//         timezone: 'Asia/Kolkata', // IST — change to your server timezone if needed
//     });

//     console.log('[ReminderCron] Certificate reminder cron scheduled (hourly).');
// };

// export default startReminderCron;