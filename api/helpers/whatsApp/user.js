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
    const welcomeMessage = `Salut et Bienvenue dans l'univers de SKIA votre nouvel ami virtuel sur WhatsApp 🤖✨! \n\nJe suis ravi de vous accueillir en tant que nouvel utilisateur. Préparez-vous à vivre des conversations passionnantes, à poser des questions et à explorer un monde de connaissances. \n\n Cependant, rappelez-vous qu'il y a un nombre limité de messages gratuits que vous pouvez envoyer. Une fois cette limite atteinte, ne vous inquiétez pas, vous pourrez souscrire à notre abonnement pour continuer à profiter de conversations enrichissantes et de fonctionnalités avancées. N'hésitez pas à explorer toutes les possibilités à portée de main et à découvrir comment SKIA peut rendre votre expérience sur WhatsApp plus agréable et productive. \n\n Si vous avez besoin d'aide à tout moment, il vous suffit de me contacter. Prêt à commencer cette aventure passionnante avec SKIA ? 💬🤗  \n\n comment je peux vous aider aujourd'hui?`;
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
            const replyMessage = 'Choisissez un forfait en répondant avec son numéro :\n' +
              subscriptions.map((subscription, index) => {
                return `${index + 1}. ${subscription.description}`;
              }).join('\n');
            msg.reply(replyMessage);
          } else {
            const replyMessage = 'Erreur lors de la récupération des forfaits.';
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
  
            const phoneNumberMessage = 'Veuillez entrer votre numéro de téléphone pour la transaction Mobile Money (ex: 6xxxxxxxx):';
            msg.reply(phoneNumberMessage);
          } else {
            const invalidForfaitMessage = 'Le numéro de forfait sélectionné est invalide. Réessayez en fournissant un numéro valide.';
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
          const invalidPhoneNumberMessage = 'Veuillez entrer uniquement un numéro MTN ou Orange.';
          msg.reply(invalidPhoneNumberMessage);
        } else {
          const invalidPhoneNumberMessage = 'Le numéro de téléphone est invalide. Veuillez saisir un numéro de téléphone au format valide (ex: 6xxxxxxxx).';
          msg.reply(invalidPhoneNumberMessage); 
        } 
      } else {
        // L'utilisateur a atteint la limite de messages gratuits
        const invalidRequestMessage = `vous avez attient votre quota journalier🤖 \n\n Nous sommes ravis de vous compter parmis nos utilisateur. Pour débloquer un accèss illimité à nos contenu premium et bénéficier d'une expérience exceptionnelle, veuillez saisir *${subscribeKeyword}* . `;
        msg.reply(invalidRequestMessage); 
      } 

    } else {
      // Si ce n'est pas la première interaction, vérifiez si l'utilisateur a demandé de générer une image
      if (msg.body.startsWith(imageKeyword)) {
        const text = msg.body.toLowerCase();
  
        const imageUrl = await getImage(text);

        if (text) {
          msg.reply("Je suis au labo, un instant... 👩‍🎨 🎨 🖼");
          
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
