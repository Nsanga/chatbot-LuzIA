require('dotenv').config();
const { getChat, getImage } = require('../openAI/openAI'); // Assurez-vous d'importer correctement les fonctions OpenAI
const MonetBil = require('../MonetBil');
const { getAllSubscriptions } = require('../../services/subscription.service');
const { MessageMedia } = require("whatsapp-web.js");

const welcomeStatusUser = {};
const imageKeyword = "imagine"
const subscribeKeyword = 'subscribe';

// Map pour stocker le compteur de messages par utilisateur
const messageCountMap = new Map();

const UserCommander = async (msg, transactionSteps) => {
  if (!welcomeStatusUser[msg.from]) {
    // Envoyer le message de bienvenue la première fois
    const welcomeMessage = `👋 Hi there! I'm SKIA, your favorite virtual assistant 🤖. I'm here to help you! 🌟\n\nTo start with, enjoy unlimited free messages from me. 🆓 You can also trigger image generation by beginning your sentence with *${imageKeyword}* 🖼.\n\nHowever, once you reach the free limit, it's time to level up! 😎 To continue enjoying my outstanding services, you can subscribe to our premium plan. 💼\n\nRemember, I'm here to answer all your questions and assist you with your tasks. So, how can I assist you today? 💬🤗`;
    msg.reply(welcomeMessage);

    // Enregistrer l'état de bienvenue pour cet utilisateur
    welcomeStatusUser[msg.from] = true;

    // Initialiser le compteur de messages à zéro pour cet utilisateur
    messageCountMap.set(msg.from, 0);
  } else {
    // Vérifier le compteur de messages de l'utilisateur
    const messageCount = messageCountMap.get(msg.from);

    if (messageCount >= 6) {

      const text = msg.body.toLowerCase();
      if (text.includes(subscribeKeyword) && !msg.isGroupMsg) {
  
        if (text.includes(subscribeKeyword) && !msg.isGroupMsg) {
          const allSubscriptionsResponse = await getAllSubscriptions();
          if (allSubscriptionsResponse.success) {
            const subscriptions = allSubscriptionsResponse.subscriptions;
            const replyMessage = 'Choose a package by responding with its number :\n' +
              subscriptions.map((subscription, index) => {
                return `${index + 1}. ${subscription.description}`;
              }).join('\n');
            msg.reply(replyMessage);
          } else {
            const replyMessage = 'Error while retrieving the packages.';
            msg.reply(replyMessage);
          }
        }
      } else if (/^\d+$/.test(msg.body) && transactionSteps[msg.from]?.step !== 'ask_phone_number') {
        const allSubscriptionsResponse = await getAllSubscriptions();
        if (allSubscriptionsResponse.success) {
          const subscriptions = allSubscriptionsResponse.subscriptions;  
          const selectedForfaitIndex = parseInt(msg.body) - 1;
  
          if (selectedForfaitIndex >= 0 && selectedForfaitIndex < subscriptions.length) {
            const selectedForfait = subscriptions[selectedForfaitIndex];
  
            // Enregistrer l'étape de la transaction pour cet utilisateur
            transactionSteps[msg.from] = { step: 'ask_phone_number', selectedForfait };
  
            const phoneNumberMessage = 'Please enter your phone number for the Mobile Money transaction (ex: 6xxxxxxxx):';
            msg.reply(phoneNumberMessage);
          } else {
            const invalidForfaitMessage = 'The selected package number is invalid. Please retry with a valid number.';
            msg.reply(invalidForfaitMessage);
          }
        }
      } else if (transactionSteps[msg.from]?.step === 'ask_phone_number') {
        let phoneNumber = msg.body.replace(/\s+/g, ''); // Supprimer les espaces
  
        // Ajouter le préfixe +237 si nécessaire
        if (!phoneNumber.startsWith('+237')) {
          phoneNumber = '+237' + phoneNumber;
        }
  
        // // Vérifier le format du numéro de téléphone
        if (/^(?:\+237)?6(?:9|8|7|5)\d{7}$/.test(phoneNumber)) {
          const allSubscriptionsResponse = await getAllSubscriptions();
          const subscriptions = allSubscriptionsResponse.subscriptions;
          const selectedForfait = transactionSteps[msg.from]?.selectedForfait;
  
          MonetBil.processPayment(msg, phoneNumber, selectedForfait, transactionSteps);
        }
        else if (/^(?:\+237)?6(?:6|2)\d{7}$/.test(phoneNumber)) {
          const invalidPhoneNumberMessage = 'Please enter only an MTN or Orange number.';
          msg.reply(invalidPhoneNumberMessage);
        } else {
          const invalidPhoneNumberMessage = 'The phone number is invalid. Please enter a valid phone number format (ex: 6xxxxxxxx).';
          msg.reply(invalidPhoneNumberMessage); 
        } 
      } else {
        // L'utilisateur a atteint la limite de messages gratuits
        const invalidRequestMessage = `You have reached your daily quota 🤖.\n\nWe are delighted to have you as one of our users. To unlock unlimited access to our premium content and enjoy an exceptional experience, please enter *${subscribeKeyword}* . `;
        msg.reply(invalidRequestMessage); 
      } 

    } else {
      // Si ce n'est pas la première interaction, vérifiez si l'utilisateur a demandé de générer une image
      if (msg.body.startsWith(imageKeyword)) {
        const text = msg.body.toLowerCase();
  
        const imageUrl = await getImage(text);

        if (text) {
          msg.reply(`I'm in the lab, just a moment... 👩‍🎨 🎨 🖼`);
          
          const result = await MessageMedia.fromUrl(imageUrl);
          if (result) {
            msg.reply(result);
          }
        }
      }else {
        const text = msg.body.toLowerCase(); // Vous pouvez adapter cette partie en fonction de la structure de votre message
        // Si l'utilisateur n'a pas demandé de générer une image, obtenez une réponse de l'IA en utilisant la fonction getChat
        const chatResponse = await getChat(text);
        if (chatResponse) {
          // Répondez à l'utilisateur avec la réponse de l'IA
          msg.reply(chatResponse);
        }

        // Incrémenter le compteur de messages
        messageCountMap.set(msg.from, messageCount + 1);
      }
    }
  }
};

module.exports = {
  UserCommander,
};
