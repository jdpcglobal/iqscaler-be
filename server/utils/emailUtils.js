// Placeholder function to simulate sending an email during development
const sendEmail = async (options) => {
  console.log('----------------------------------------------------');
  console.log('--- PASSWORD RESET EMAIL SIMULATION ---');
  console.log(`TO: ${options.to}`);
  console.log(`SUBJECT: ${options.subject}`);
  console.log(`BODY: ${options.text}`);
  console.log('----------------------------------------------------');
  
  // In a production environment, you would replace this with actual email code (e.g., nodemailer)
  
  return Promise.resolve(); // Simulate success
};

export { sendEmail };