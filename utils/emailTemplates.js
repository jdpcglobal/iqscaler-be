// server/utils/emailTemplates.js

/**
 * Generates the HTML email sent immediately after test completion.
 *
 * @param {Object} params
 * @param {string} params.username
 * @param {number} params.totalScore
 * @param {number} params.correctAnswers
 * @param {number} params.questionsAttempted
 * @param {number|null} params.iqScore      - null until certificate purchased
 * @param {Object} params.difficultyBreakdown - { easy, medium, hard }
 * @param {string} params.resultId
 * @param {string} params.clientUrl         - e.g. https://www.iqscaler.com
 * @returns {string} Full HTML string
 */
export const getResultEmailTemplate = ({
    username,
    totalScore,
    correctAnswers,
    questionsAttempted,
    iqScore,
    difficultyBreakdown = {},
    resultId,
    clientUrl,
}) => {
    const scorePercentage =
        questionsAttempted > 0
            ? ((correctAnswers / questionsAttempted) * 100).toFixed(1)
            : '0.0';

    const purchaseUrl = `${clientUrl}/result/${resultId}`;

    const easy   = difficultyBreakdown?.easy   ?? 0;
    const medium = difficultyBreakdown?.medium ?? 0;
    const hard   = difficultyBreakdown?.hard   ?? 0;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your IQ Scaler Results</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);
                        padding:36px 40px;text-align:center;">
              <img src="assets/images/IQlogo.webp"
                   alt="IQ Scaler"
                   width="56"
                   style="display:block;margin:0 auto 12px;border-radius:8px;" />
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;
                          letter-spacing:-0.5px;">
                Your IQ Test Results Are Ready
              </h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">
                Completed on ${new Date().toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0;font-size:16px;color:#374151;">
                Hi <strong>${username}</strong>,
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:#6b7280;line-height:1.6;">
                Great job completing your cognitive assessment! Here is a summary
                of your performance.
              </p>
            </td>
          </tr>

          <!-- Score Summary Cards -->
          <tr>
            <td style="padding:24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>

                  <!-- Score -->
                  <td width="33%" style="text-align:center;padding:0 8px 0 0;">
                    <div style="background:#eff6ff;border-radius:10px;padding:20px 12px;
                                border-top:4px solid #2563eb;">
                      <div style="font-size:28px;font-weight:800;color:#1d4ed8;">
                        ${totalScore}
                      </div>
                      <div style="font-size:12px;color:#6b7280;margin-top:4px;
                                  font-weight:600;text-transform:uppercase;
                                  letter-spacing:0.5px;">
                        Total Score
                      </div>
                    </div>
                  </td>

                  <!-- Percentage -->
                  <td width="33%" style="text-align:center;padding:0 4px;">
                    <div style="background:#f0fdf4;border-radius:10px;padding:20px 12px;
                                border-top:4px solid #16a34a;">
                      <div style="font-size:28px;font-weight:800;color:#15803d;">
                        ${scorePercentage}%
                      </div>
                      <div style="font-size:12px;color:#6b7280;margin-top:4px;
                                  font-weight:600;text-transform:uppercase;
                                  letter-spacing:0.5px;">
                        Accuracy
                      </div>
                    </div>
                  </td>

                  <!-- Correct / Total -->
                  <td width="33%" style="text-align:center;padding:0 0 0 8px;">
                    <div style="background:#faf5ff;border-radius:10px;padding:20px 12px;
                                border-top:4px solid #7c3aed;">
                      <div style="font-size:28px;font-weight:800;color:#6d28d9;">
                        ${correctAnswers}/${questionsAttempted}
                      </div>
                      <div style="font-size:12px;color:#6b7280;margin-top:4px;
                                  font-weight:600;text-transform:uppercase;
                                  letter-spacing:0.5px;">
                        Correct
                      </div>
                    </div>
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- Difficulty Breakdown -->
          <tr>
            <td style="padding:24px 40px 0;">
              <h3 style="margin:0 0 14px;font-size:14px;color:#374151;
                          text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">
                Difficulty Breakdown
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-collapse:collapse;border-radius:8px;overflow:hidden;
                            border:1px solid #e5e7eb;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:10px 16px;text-align:left;font-size:13px;
                                color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">
                      Level
                    </th>
                    <th style="padding:10px 16px;text-align:center;font-size:13px;
                                color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">
                      Correct
                    </th>
                    <th style="padding:10px 16px;text-align:right;font-size:13px;
                                color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding:10px 16px;font-size:14px;color:#374151;">
                      🟢 Easy
                    </td>
                    <td style="padding:10px 16px;text-align:center;font-size:14px;
                                color:#374151;font-weight:600;">
                      ${easy}
                    </td>
                    <td style="padding:10px 16px;text-align:right;font-size:14px;
                                color:#374151;">
                      ${easy * 1} pts
                    </td>
                  </tr>
                  <tr style="background:#f9fafb;">
                    <td style="padding:10px 16px;font-size:14px;color:#374151;">
                      🟡 Medium
                    </td>
                    <td style="padding:10px 16px;text-align:center;font-size:14px;
                                color:#374151;font-weight:600;">
                      ${medium}
                    </td>
                    <td style="padding:10px 16px;text-align:right;font-size:14px;
                                color:#374151;">
                      ${medium * 3} pts
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;font-size:14px;color:#374151;">
                      🔴 Hard
                    </td>
                    <td style="padding:10px 16px;text-align:center;font-size:14px;
                                color:#374151;font-weight:600;">
                      ${hard}
                    </td>
                    <td style="padding:10px 16px;text-align:right;font-size:14px;
                                color:#374151;">
                      ${hard * 6} pts
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- IQ Score Teaser -->
          <tr>
            <td style="padding:24px 40px 0;">
              <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);
                          border-radius:10px;padding:20px 24px;
                          border-left:5px solid #f59e0b;text-align:center;">
                <p style="margin:0;font-size:15px;color:#92400e;font-weight:600;">
                  🔒 Your IQ Score Has Been Calculated
                </p>
                <p style="margin:8px 0 0;font-size:14px;color:#b45309;line-height:1.5;">
                  ${iqScore !== null
                    ? `Your estimated IQ is <strong>${iqScore}</strong>. Purchase your certificate to receive your official report.`
                    : `Purchase your official certificate to unlock your IQ score and receive a verified report.`
                  }
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:28px 40px 0;text-align:center;">
              <a href="${purchaseUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);
                        color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;
                        padding:16px 40px;border-radius:8px;
                        box-shadow:0 4px 12px rgba(22,163,74,0.35);
                        letter-spacing:0.3px;">
                🎓 Purchase Your Certificate
              </a>
              <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
                View your full result details and unlock your IQ score
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 40px 0;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 36px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                This email was sent by
                <strong style="color:#6b7280;">IQ Scaler</strong> because you
                completed a test on
                <a href="${clientUrl}" style="color:#2563eb;text-decoration:none;">
                  iqscaler.com
                </a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;line-height:1.5;">
                Disclaimer: This assessment is for informational and self-assessment
                purposes only and is not a substitute for professional clinical evaluation.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>
`;
};


/**
 * Generates the reminder HTML email sent ~24 hours after test completion
 * when the user has NOT yet purchased the certificate.
 *
 * @param {Object} params  - same shape as getResultEmailTemplate
 * @returns {string} Full HTML string
 */
export const getReminderEmailTemplate = ({
    username,
    totalScore,
    correctAnswers,
    questionsAttempted,
    iqScore,
    resultId,
    clientUrl,
}) => {
    const scorePercentage =
        questionsAttempted > 0
            ? ((correctAnswers / questionsAttempted) * 100).toFixed(1)
            : '0.0';

    const purchaseUrl = `${clientUrl}/result/${resultId}`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your IQ Certificate is Waiting</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header — warm amber tone to distinguish from result email -->
          <tr>
            <td style="background:linear-gradient(135deg,#d97706,#f59e0b);
                        padding:36px 40px;text-align:center;">
              <img src="${clientUrl}/IQlogo.ico"
                   alt="IQ Scaler"
                   width="56"
                   style="display:block;margin:0 auto 12px;border-radius:8px;" />
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;
                          letter-spacing:-0.5px;">
                ⏰ Your Certificate is Still Waiting
              </h1>
              <p style="margin:8px 0 0;color:#fef3c7;font-size:14px;">
                Don't let your results go uncertified
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0;font-size:16px;color:#374151;">
                Hi <strong>${username}</strong>,
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:#6b7280;line-height:1.6;">
                You completed your IQ assessment yesterday and your results are ready —
                but your official certificate hasn't been claimed yet.
              </p>
            </td>
          </tr>

          <!-- Score Recap -->
          <tr>
            <td style="padding:24px 40px 0;">
              <div style="background:#f9fafb;border-radius:10px;padding:20px 24px;
                          border:1px solid #e5e7eb;">
                <h3 style="margin:0 0 14px;font-size:13px;color:#6b7280;
                            text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">
                  Your Results Recap
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:14px;color:#374151;padding:4px 0;">
                      Total Score
                    </td>
                    <td style="font-size:14px;font-weight:700;color:#1d4ed8;
                                text-align:right;padding:4px 0;">
                      ${totalScore}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#374151;padding:4px 0;">
                      Accuracy
                    </td>
                    <td style="font-size:14px;font-weight:700;color:#15803d;
                                text-align:right;padding:4px 0;">
                      ${scorePercentage}%
                      (${correctAnswers}/${questionsAttempted})
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#374151;padding:4px 0;">
                      IQ Score
                    </td>
                    <td style="font-size:14px;font-weight:700;color:#7c3aed;
                                text-align:right;padding:4px 0;">
                      ${iqScore !== null ? iqScore : '🔒 Locked'}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Urgency Block -->
          <tr>
            <td style="padding:24px 40px 0;">
              <div style="background:#fff7ed;border-radius:10px;padding:20px 24px;
                          border-left:5px solid #f97316;text-align:center;">
                <p style="margin:0;font-size:15px;color:#9a3412;font-weight:700;">
                  Most people never find out their true IQ.
                </p>
                <p style="margin:8px 0 0;font-size:14px;color:#c2410c;line-height:1.5;">
                  Yours is ready. Certify it today and share your verified
                  achievement with the world.
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:28px 40px 0;text-align:center;">
              <a href="${purchaseUrl}"
                 style="display:inline-block;
                        background:linear-gradient(135deg,#d97706,#b45309);
                        color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;
                        padding:16px 40px;border-radius:8px;
                        box-shadow:0 4px 12px rgba(217,119,6,0.35);
                        letter-spacing:0.3px;">
                🎓 Claim My Certificate Now
              </a>
              <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
                One-time payment · Instant digital delivery · Shareable &amp; verifiable
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 40px 0;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 36px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                You received this because you completed an IQ assessment on
                <a href="${clientUrl}" style="color:#2563eb;text-decoration:none;">
                  iqscaler.com
                </a>.
                This is a one-time reminder.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;line-height:1.5;">
                Disclaimer: This assessment is for informational and self-assessment
                purposes only and is not a substitute for professional clinical evaluation.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
};