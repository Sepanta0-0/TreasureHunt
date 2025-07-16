// Base URL for Treasure Hunt API
const API = "https://codecyprus.org/th/api";
let activeGame;



// For API to showcase the list
async function loadGameFile() {
    const url = `${API}/list`;
    console.info("Initiating request to load available hunts.", url);
    try {
        const reply = await fetch(url);
        if (!reply.ok) {
            const errorText = await reply.text();
            console.error(`Network or HTTP error when loading the game: ${reply.status} ${reply.statusText}. Response: ${errorText}`);
            showTheMessage("Unfortunately the game cannot be loaded because of connection problems.", true);
            return;
        }
        const result = await reply.json();
        console.info("Available hunts were loaded:", result.treasureHunts);
        if (result.status === "OK") {
            showHuntList(result.treasureHunts);
        } else {
            console.error("API error while loading the game.", result.errorMessage || result.status);
            showTheMessage("The list of the games cannot be loaded right now.", true);
        }
    } catch (error) {
        console.error("Unexpected error happened when loading the game file.", error.message);
        showTheMessage("Something unexpected happened while trying to get the game data.", true);
    }
}

// To display the questions for the players
function showHuntList(hunts) {
    const selection = document.getElementById('selectionFromList');
    selection.innerHTML = "";
    hunts.forEach(hunt => {
        const button = document.createElement('button');
        button.textContent = hunt.name;
        button.onclick = () => {
            startTheGame(hunt.uuid);
        };
        selection.appendChild(button);
    });
    selection.style.display = 'block';
}

// To start the game session for Treasure Hunt
async function startTheGame(huntId) {
    const userName = getCookie('username');
    console.info("Username from cookies: ", userName);
    if (!huntId) {
        console.warn("Warning: An attempt to start the game with an undefined ID.")
        showTheMessage("Cannot start the game because no hunt is selected.", true);
        return;
    }
    console.info("Starting the ID", huntId);
    const url = `${API}/start?player=${encodeURIComponent(userName)}&app=the-game-hunt&treasure-hunt-id=${encodeURIComponent(huntId)}`;
    console.info("API request URL", url);
    try {
        const reply = await fetch(url);
        if (!reply.ok) {
            const errorText = await reply.text();
            console.error(`Network or HTTP error when starting the game: ${reply.status} ${reply.statusText}. Response: ${errorText}`);
            showTheMessage("Failed to start the game and connection is the problem", true);
            return;
        }
        const result = await reply.json();
        console.log("API response for the game to start: ", JSON.stringify(result, null, 2));
        if (result.status === "OK") {
            activeGame = result.session;
            console.info("Game session has started", activeGame);
            document.getElementById('selectionFromList').style.display = "none";
            document.getElementById('Arena').style.display = "block";
            try {
                await showTheQuestion();
            } catch(questionError) {
                console.error("The API is giving errors when getting the first question: ", questionError.message);
                showTheMessage("The game starts but the first question cannot be loaded.", true);
            }
        } else {
            console.error("The API is handing out errors: ", result.errorMessage || result.status);
            showTheMessage("Unfortunately the game cannot start.", true)
        }
    } catch(error) {
        console.error("Network error: ", error.message);
        showTheMessage("Cannot get connected to the game. Try again after checking your internet.", true)
    }
}

// To ask about the other questions in order during the active session
async function showTheQuestion() {
    if (!activeGame) {
        console.warn("Warning: there is no active game session when trying to get a question.");
        showTheMessage("Game session not started yet so cannot get the next question.", true)
        return;
    }
    const url = `${API}/question?session=${activeGame}`;
    console.info("Getting question for session", url);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Network or HTTP error when getting the question: ${response.status} ${response.statusText}. Response: ${errorText}`);
            showTheMessage("Failed to get question.", true);
            return;
        }
        const result = await response.json();
        console.log("API response for the question:", result);
        if (result.status === "OK") {
            if (result.completed) {
                console.info("Hunt is done. Here are the results.");
                document.getElementById('Arena').style.display = "none";
                showTheMessage("Congratulations, you finished the game.", false);
                return;
            }
            givingQuestion(result);
            console.info("Question is being shown", result.questionText)
        } else {
            console.error("API gave out an error when getting the question", result.errorMessage || result.status);
            showTheMessage(`The next question cannot be shown: ${result.errorMessage || "Unknown error happened."}`, true);
        }
    } catch(error) {
        console.error("An error is not letting the questions to be loaded.", error.message);
        showTheMessage("Unfortunately the questions cannot be loaded because of an error.", true);
    }
}


// Creating the answer after rendering the question
async function givingQuestion(question) {
    console.log("Providing question:", question);
    document.getElementById('questionPack').innerHTML = question.questionText;
    const answerSector = document.getElementById('answerChoices');
    answerSector.innerHTML = "";
    switch (question.questionType) {
        case 'BOOLEAN':
            answerSector.innerHTML = '';
            const trueButton = document.createElement('button');
            trueButton.textContent = 'True';
            trueButton.addEventListener('click', () =>{
                directingAnswer('true');
            });
            const falseButton = document.createElement('button');
            falseButton.textContent = 'False';
            falseButton.addEventListener('click', () =>{
                directingAnswer('false');
            });
            answerSector.appendChild(trueButton);
            answerSector.appendChild(falseButton);
            break;
        case 'MCQ':
            if (question.possibleAnswers && Array.isArray(question.possibleAnswers) && question.possibleAnswers.length > 0) {
                question.possibleAnswers.forEach((option) => {
                    const button = document.createElement('button');
                    button.textContent = option;
                    button.addEventListener('click', () => directingAnswer(option));
                    answerSector.appendChild(button);
                });
            } else {
                console.warn("MCQ question is missing 'possibleAnswer'");
                ['A', 'B', 'C', 'D'].forEach((option) => {
                    const button = document.createElement("button");
                    button.textContent = option;
                    button.addEventListener('click', () => directingAnswer(option));
                    answerSector.appendChild(button);
                });
            }
            break;
        case 'TEXT':
            const userIntake = document.createElement('input');
            userIntake.type = 'text';
            userIntake.id = 'userAnswer';
            userIntake.placeholder = 'Put your answer here:';

            const giveInButton = document.createElement('button');
            giveInButton.textContent = 'Submit';
            giveInButton.addEventListener('click', () => {
                const answerText = userIntake.value;
                directingAnswer(answerText);
            });
            answerSector.appendChild(userIntake);
            answerSector.appendChild(giveInButton);
            break;
        case 'INTEGER':
        case 'NUMERIC':
            const numGiveIn = document.createElement('input');
            numGiveIn.type = 'number';
            numGiveIn.id = 'numAnswer';
            numGiveIn.placeholder = 'Put a number';
            const submitNumberButton = document.createElement('button');
            submitNumberButton.textContent = 'Submit';
            submitNumberButton.addEventListener('click', () =>{
                directingAnswer(numGiveIn.value);
            });
            answerSector.appendChild(numGiveIn);
            answerSector.appendChild(submitNumberButton);
            break;
        default:
            console.warn("We encountered an unknown question", question.questionType, ". Defaulting to text input.");
            const defaultGiveIn = document.createElement('input');
            defaultGiveIn.type = 'text';
            defaultGiveIn.id = 'defaultAnswer';
            defaultGiveIn.placeholder = 'Put your answer:';
            const submitDefaultButton = document.createElement('button');
            submitDefaultButton.textContent = 'Submit';
            submitDefaultButton.addEventListener('click', () =>{
                directingAnswer(defaultGiveIn.value);
            });
            answerSector.appendChild(defaultGiveIn);
            answerSector.appendChild(submitDefaultButton);
            break;
    }
    console.info("Question was successfully performed.")
}

// Geolocation helping to receive the user's location
function getPlayerLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (position) { resolve(position); },
                function (error) {reject(error); },
                {enableHighAccuracy: true, timeout: 10000, maximumAge: 0}
            );
        } else {
            reject(new Error("Geolocation is not supported by your browser."));
        }
    });
}

// Having locations to be sent to API
async function forwardPlayerLocation(lat, lon) {
    if (!activeGame) {
        console.error("An attempt was made to send location without an active game.");
        showTheMessage("The location cannot be updated due to no active game.", true);
        return;
    }
    const url = `${API}/location?session=${activeGame}&latitude=${lat}&longitude=${lon}`;
    console.info("API getting player's location", url);
    try {
        const reply = await fetch(url);
        if (!reply.ok) {
            const errorText = await reply.text();
            console.error(`Network or HTTP error while sending location: ${reply.status} ${reply.statusText}. Response: ${errorText}`);
            showTheMessage("Due to connection issues, location cannot be updated.", true);
            return;
        }
        const result = await reply.json();
        console.log("API response for updating location: ", JSON.stringify(result, null, 2));
        if (result.status === "OK") {
            console.info("API updated player's location.");
        } else {
            console.error("An error was reported by API:", result.errorMessage || result.status);
            showTheMessage(`The are problems with updating your location. ${result.errorMessage || "Unknown error"}`, true);
        }
    } catch(error) {
        console.error("An error happened when sending location.", error.message);
        showTheMessage("Something happened while updating your location.", true);
    }
}

// Answers to be submitted to the API
async function directingAnswer(playerAnswer){
    if (!activeGame) {
        console.warn("An attempt was made to submit the answer while no game being active.");
        showTheMessage("No active game so no submitting answer", true);
        return;
    }
    const url = `${API}/answer?session=${activeGame}&answer=${encodeURIComponent(playerAnswer)}`;
    console.info("API getting player's answer", url);
    try {
        const reply = await fetch(url);
        if (!reply.ok) {
            const errorText = await reply.text();
            console.error(`Network or HTTP error while submitting the answer: ${reply.status} ${reply.statusText}. Response: ${errorText}`);
            showTheMessage("Cannot submit the answer because of connection issues.", true);
            return;
        }
        const result = await reply.json();
        console.log("API response for submitting the answer: ", JSON.stringify(result, null, 2));
        if (result.status === "OK") {
            console.info("Answer submitted successfully.");
            if (result.completed) {
                console.info("The hunts are completed after submitting the answer.");
                resultOutput();
            } else {
                await showTheQuestion();
            }
        } else {
            console.error("An error was reported when submitting the answer", result.errorMessage || result.status);
            showTheMessage(`Failed to submit the answer: ${result.errorMessage || "Unknown error"}`, true);
        }
    } catch (error) {
        console.error("An error happened when submitting the answer.", error.message);
        showTheMessage("There is a problem with submitting the answer.", true);
    }
}

// To help the leaderboard function displaying the results
function showLeaderboard(leaderboard) {
    let theLeaderboard = document.getElementById('leaderboard');
    theLeaderboard.innerHTML = "";
    leaderboard.forEach(function (entry, index) {
        theLeaderboard.innerHTML += (index + 1) + ". " + entry.player + " - " + entry.score + "<br>";
    });
}

// Results of the game at the end plus showcasing leaderboard
async function resultOutput() {
    if (!activeGame) {
        console.warn("An attempt was made to display the results without an active game.");
        showTheMessage("Cannot show the results due to no active game.", true);
        return;
    }
    document.getElementById("Arena").style.display = 'none';
    document.getElementById("arenaAnswers").style.display = 'block';
    try {
        const scoreUrl = `${API}/score?session=${activeGame}`;
        console.info("Getting final score: ", scoreUrl);
        const scoreReply = await fetch(scoreUrl);
        if (!scoreReply.ok) {
            const errorText = await scoreReply.text();
            console.error(`Network or HTTP error while getting score: ${scoreReply.status} ${scoreReply.statusText}. Response: ${errorText}`);
            showTheMessage("Cannot get the final results because of network issues.", true);
            return;
        }
        const scoreResult = await scoreReply.json();
        console.log("API response for score:", JSON.stringify(scoreResult, null, 2));
        if (scoreResult.status === "OK") {
            document.getElementById('totalPoint').innerHTML = scoreResult.score;
            console.info("Score showing: ", scoreResult.score)

            try {
                const leaderboardUrl = `${API}/leaderboard?session=${activeGame}&sorted=true&limit=10`;
                console.info("Getting leaderboard: ", leaderboardUrl);
                const leaderboardReply = await fetch(leaderboardUrl);
                if (!leaderboardReply.ok) {
                    const errorText = await leaderboardReply.text();
                    console.error(`Network or HTTP error while getting leaderboard: ${leaderboardReply.status} ${leaderboardReply.statusText}. Response: ${errorText}`);
                    showTheMessage("Cannot load the leaderboard", true);
                    return;
                }
                const leaderboardResult = await leaderboardReply.json();
                console.log("API response for leaderboard: ", JSON.stringify(leaderboardResult, null, 2));
                if (leaderboardResult.status === "OK") {
                    showLeaderboard(leaderboardResult.leaderboard);
                    console.info("Leaderboard is being shown.");
                } else {
                    console.error("API reported an error when getting the leaderboard", leaderboardResult.errorMessage || leaderboardResult.status);
                    showTheMessage(`Cannot get the leaderboard: ${leaderboardResult.errorMessage || "Unknown error"}`, true);
                }
            } catch (leaderboardError) {
                console.error("Unexpected error when getting the leaderboard", leaderboardError.message);
                showTheMessage("Cannot load the leaderboard", true);
            }
        } else {
            console.error("API reported an error when getting the score: ", scoreResult.errorMessage || scoreResult.status);
            showTheMessage(`Cannot get the final score: ${scoreResult.errorMessage || "Unknown error"}`, true);
        }
    } catch (scoreError) {
        console.error("An error happened when getting the score: ", scoreError.message);
        showTheMessage("Unexpected error happened while trying to get your score.", true);
    }
}

// Handling the skipping button
document.addEventListener('DOMContentLoaded', function () {
    const skipKey = document.getElementById('skip');
    if (skipKey) {
        skipKey.addEventListener('click', async () => {
            if (!activeGame) {
                console.warn("An attempt was made to skip without an active game.")
                showTheMessage("Cannot skip the active game.", true);
                return;
            }
            const url = `${API}/skip?session=${activeGame}`;
            console.info("Sending skip request to API:", url);
            try {
                const reply = await fetch(url);
                if (!reply.ok) {
                    const errorText = await reply.text();
                    console.warn(`Network or HTTP error while sending request to API: ${reply.status} ${reply.statusText}. Response: ${errorText}`);
                    showTheMessage("Failed to skip the question because of network issues.", true);
                    return;
                }
                const result = await reply.json();
                console.log("API response for skip:", JSON.stringify(result, null, 2));
                if (result.status === "OK") {
                    console.info("Question skipped successfully!");
                    if (result.completed) {
                        console.info("Hunt is completed after skipping.");
                        resultOutput();
                    } else {
                        await showTheQuestion();
                    }
                } else {
                    console.error("API gave out an error when skipping a question: ", result.errorMessage || result.status);
                    showTheMessage(`Failed to skip the question: ${result.errorMessage || "Unknown error"}`, true);
                }
            } catch (error) {
                console.error("An error happened when trying to skip the question: ", error.message);
                showTheMessage("An error happened when trying to skip the question.", true);
            }
        });

    } else {
        console.warn("Skip button element was not found in the DOM.");
    }
});

