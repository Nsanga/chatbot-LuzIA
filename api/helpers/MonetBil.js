const axios = require('axios');

async function processPayment(msg, phoneNumber, selectedForfait, subscriptions, transactionSteps) {
  const selectedSubscription = subscriptions.find(subscription => subscription.name === selectedForfait);

  const paymentData = {
    service: process.env.PAYMENT_SERVICE_ID,
    phonenumber: phoneNumber.replace(/^\+/, '').replace(/\s/g, ''),
    amount: selectedSubscription?.price || selectedForfait,
    user: msg.from.replace(/@c\.us$/, ""),
    first_name: selectedSubscription?.durationInDays,
    item_ref: selectedSubscription?.description,
  };

  const apiEndpoint = process.env.PAYMENT_API_ENDPOINT;

  try {
    const response = await axios.post(apiEndpoint, paymentData);

    if (response.data.status == "REQUEST_ACCEPTED") {
      const confirmationMessage = `Transaction ${response.data.channel_name} en cours de traitement veuillez saisir ${response.data.channel_ussd}`;
      msg.reply(confirmationMessage);
    } else {
      const errorMessage = 'La transaction n\'a pas été effectuée. Veuillez réessayer plus tard.';
      msg.reply(errorMessage);
    }
  } catch (error) {
    console.error(error);
    const errorMessage = 'Une erreur s\'est produite lors du traitement de la transaction. Veuillez réessayer plus tard.';
    msg.reply(errorMessage);
  } finally {
    delete transactionSteps[msg.from];
  }
}

module.exports = {
  processPayment
};
