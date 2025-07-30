function checkGuess() {
      const userNumber = parseInt(document.getElementById('userGuess').value);
      const randomNumber = Math.floor(Math.random() * 10) + 1;
      const resultBox = document.getElementById('resultBox');

      if (isNaN(userNumber) || userNumber < 1 || userNumber > 10) {
        resultBox.innerHTML = "⚠️ Please enter a number between 1 and 10.";
        return;
      }

      if (userNumber === randomNumber) {
        resultBox.innerHTML = `Walahi you're a thief😁🤌`;
      } else {
        resultBox.innerHTML = `Walahi you're a thief😁🤌`;
      }
    }