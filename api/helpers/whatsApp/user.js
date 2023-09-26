require('dotenv').config();
const { getChat, getImage } = require('../openAI/openAI'); // Assurez-vous d'importer correctement les fonctions OpenAI

const welcomeStatusUser = {};
const imageKeyword = "imagine"

const UserCommander = async (msg, transactionSteps) => {
  if (!welcomeStatusUser[msg.from]) {
    // Envoyer le message de bienvenue la première fois
    const welcomeMessage = `Bonjour ! Je suis LuzIA, ton assistante personnelle. Je suis là pour t'aider. Demande-moi des infos pour un voyage, un programme d'entraînement, ou comment prendre soin de tes plantes. Je peux même dessiner selon ton imagination !\n\nEssaye de me poser des questions par écrit ou par note vocale. Si tu veux que je te fasse un dessin, il suffit que tu commences la description par le mot *${imageKeyword}*. Tu peux aussi parler à l'un de mes amis en écrivant "amis", et tu pourras alors choisir de discuter avec Hermione, réviser tes cours d'anglais, et bien d'autres choses. \n\nN'oublie pas que je vise à m'améliorer tous les jours, donc même si certaines réponses sur des gens, lieux ou faits peuvent être imprécises ou obsolètes, je m'améliore constamment. Ta vie privée est notre priorité, donc ne partage aucune information personnelle avec moi.\n\nQu'est-ce que je peux faire pour toi aujourd'hui ? 🤗`;
    msg.reply(welcomeMessage);

    // Enregistrer l'état de bienvenue pour cet utilisateur
    welcomeStatusUser[msg.from] = true;
  } else {
    // Si ce n'est pas la première interaction, vérifiez si l'utilisateur a demandé de générer une image
    const text = msg.body.toLowerCase(); // Vous pouvez adapter cette partie en fonction de la structure de votre message
    if (text.includes(imageKeyword)) {
      // L'utilisateur a demandé de générer une image, extrayez la description après "imagine"
      const description = text.split(imageKeyword)[1].trim();

      if (description) {
        // envoyer un message d'attente"
        msg.reply("Je suis au labo, un instant... 👩‍🎨 🎨 🖼");

        // Utilisez la fonction getImage pour générer l'image en fonction de la description
        const imageUrl = await getImage(description);
        if (imageUrl) {
          // Répondez à l'utilisateur avec l'image générée sans texte supplémentaire
          msg.reply({ url: imageUrl });
        } else {
          // En cas d'erreur lors de la génération de l'image
          msg.reply("Désolé, je n'ai pas pu générer l'image pour cette description.");
        }
      }
    } else {
      // Si l'utilisateur n'a pas demandé de générer une image, obtenez une réponse de l'IA en utilisant la fonction getChat
      const chatResponse = await getChat(text);
      if (chatResponse) {
        // Répondez à l'utilisateur avec la réponse de l'IA
        msg.reply(chatResponse);
      }
    }
  }
};

module.exports = {
  UserCommander,
};
