const currentDate = new Date(); 
let chosenDay = currentDate.getDate();
let chosenMonth = currentDate.getMonth;
let chosenYear = currentDate.getFullYear();

function getChosenDay() {
    return chosenDay;
}
function getChosenMonth() {
    return chosenMonth;
}
function getChosenYear() {
    return chosenYear;
}
function setChosenDay(chosen) {
    chosenDay = chosen;
}
function setChosenMonth(chosen) {
    chosenMonth = chosen;
}
function setChosenYear(chosen) {
    chosenYear = chosen;
}