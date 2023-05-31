const CARDS = [
    {
        id: 1,
        name: 'javascript',
        img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/74196/js-logo.png'
    },
    {
        id: 2,
        name: 'css3',
        img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/74196/css3-logo.png'
    },
    {
        id: 3,
        name: 'html5',
        img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/74196/html5-logo.png'
    },

    {
        id: 4,
        name: 'node',
        img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/74196/nodejs-logo.png'
    },
    {
        id: 5,
        name: 'react',
        img:
            'https://res.cloudinary.com/henryzarza/image/upload/v1601735662/General%20assets/react_m1pmwj.png'
    },
    {
        id: 6,
        name: 'angular',
        img:
            'https://res.cloudinary.com/henryzarza/image/upload/v1601735662/General%20assets/angular_qqblks.png'
    },

];
const cardContainer = document.querySelector('.card-container');
const available = document.querySelector('#available');
let currentCards = [...CARDS, ...CARDS];
let isPaused = false;
let counter = CARDS.length + 10;
let isLose = false;

// Fisher--Yates Algorithm -- https://bost.ocks.org/mike/shuffle/
function shuffle(array) {
    let counter = array.length,
        temp,
        index;
    while (counter > 0) {
        index = Math.floor(Math.random() * counter);
        counter--;
        temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}

function handleClick(e) {
    const { target } = e;
    if (
        !isPaused &&
        !isLose &&
        !target.classList.contains('card--guessed') &&
        !target.classList.contains('card--picked')
    ) {
        isPaused = true;
        const pickedCards = cardContainer.querySelectorAll('.card--picked');
        if (pickedCards.length > 0) {
            if (pickedCards[0].dataset.id === target.dataset.id) {
                target.classList.remove('card--picked');
                pickedCards[0].classList.remove('card--picked');
                target.classList.add('card--guessed');
                pickedCards[0].classList.add('card--guessed');
                isPaused = false;
            } else {
                target.classList.add('card--picked');
                setTimeout(() => {
                    target.classList.remove('card--picked');
                    pickedCards[0].classList.remove('card--picked');
                    isPaused = false;
                }, 1500);
            }
            console.log('counter', counter);
            counter -= 1;
            available.innerHTML = counter;
            if (counter === 0) {
                lose();
            }
        } else {
            target.classList.add('card--picked');
            isPaused = false;
        }

        const isWin = cardContainer.querySelectorAll('.card--guessed').length === currentCards.length;
        if (isWin) { win(); }
    }
}

function drawCards() {
    cardContainer.innerHTML = ''; available.innerHTML = counter;
    shuffle(currentCards).forEach((el) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-id', el.id);
        card.innerHTML = `
      <div class="card__front">
        <img
          class="front__img"
          src="${el.img}"
          alt="${el.name}"
        />
        <h6 class="card__name">${el.name}</h6>
      </div>
      <div class="card__back">

      </div>`;
        card.addEventListener('click', handleClick);
        cardContainer.appendChild(card);
    });
}

document.querySelector('#play-again').addEventListener('click', function () { modal.classList.remove('modal--open'); isPaused = false; isLose = false; counter = CARDS.length + 10; drawCards(); });

drawCards();
let button = document.getElementById('reset');

function resetGame() {
    counter = 16;
    drawCards();

}