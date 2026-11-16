/**
 * Fast Reflex Chinese Word Matching Game
 */
const MatchGame = {
  allWords: [],
  cards: [],
  selectedCard: null,
  matchedCount: 0,
  timerInterval: null,
  secondsElapsed: 0,

  init(allWords) {
    this.allWords = allWords || [];
  },

  startGame(scope = 'hsk1', pairCount = 8) {
    let pool = [...this.allWords];
    if (scope === 'hsk1') pool = pool.filter(w => w.hsk === 1);
    else if (scope === 'hsk2') pool = pool.filter(w => w.hsk === 2);

    if (pool.length < pairCount) pool = this.allWords;

    const selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, pairCount);
    
    // Create card pairs (Hanzi card + Meaning/Pinyin card)
    this.cards = [];
    selected.forEach(word => {
      this.cards.push({
        id: 'h_' + word.id,
        wordId: word.id,
        type: 'hanzi',
        text: word.hanzi,
        word
      });
      this.cards.push({
        id: 'm_' + word.id,
        wordId: word.id,
        type: 'meaning',
        text: word.meaning.split(/[,;]/)[0], // short meaning
        word
      });
    });

    // Shuffle cards
    this.cards.sort(() => 0.5 - Math.random());
    this.selectedCard = null;
    this.matchedCount = 0;
    this.secondsElapsed = 0;

    // Reset & start timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    const timerEl = document.getElementById('match-timer');
    if (timerEl) timerEl.innerText = '0s';
    this.timerInterval = setInterval(() => {
      this.secondsElapsed++;
      if (timerEl) timerEl.innerText = `${this.secondsElapsed}s`;
    }, 1000);

    this.render();
  },

  handleCardClick(card, element) {
    if (element.classList.contains('matched') || element.classList.contains('selected')) return;

    if (!this.selectedCard) {
      // First card chosen
      this.selectedCard = { card, element };
      element.classList.add('selected');
      AudioEngine.playClickSound();
    } else {
      // Second card chosen
      if (this.selectedCard.card.id === card.id) return;

      const first = this.selectedCard;
      element.classList.add('selected');

      // Check match
      if (first.card.wordId === card.wordId && first.card.type !== card.type) {
        // MATCH!
        setTimeout(() => {
          first.element.classList.remove('selected');
          element.classList.remove('selected');
          first.element.classList.add('matched');
          element.classList.add('matched');
          AudioEngine.playCorrectSound();
          this.matchedCount++;

          if (this.matchedCount === this.cards.length / 2) {
            clearInterval(this.timerInterval);
            AudioEngine.playVictorySound();
            if (typeof App !== 'undefined' && App.toast) {
              App.toast(`🎉 Chúc mừng! Bạn đã ghép đúng tất cả trong ${this.secondsElapsed} giây!`, 'success', 5000);
            } else {
              alert(`🎉 Chúc mừng! Bạn đã hoàn thành trong ${this.secondsElapsed} giây!`);
            }
          }
        }, 150);
      } else {
        // WRONG MATCH
        setTimeout(() => {
          first.element.classList.remove('selected');
          element.classList.remove('selected');
          AudioEngine.playWrongSound();
        }, 350);
      }
      this.selectedCard = null;
    }
  },

  render() {
    const grid = document.getElementById('match-game-grid');
    if (!grid) return;
    grid.innerHTML = '';

    this.cards.forEach(c => {
      const cardEl = document.createElement('div');
      cardEl.className = 'match-card';
      if (c.type === 'hanzi') {
        cardEl.innerHTML = `<span class="hanzi" style="font-size:1.75rem;">${c.text}</span>`;
      } else {
        cardEl.innerHTML = `<span style="font-size:0.9rem; line-height:1.2;">${c.text}</span>`;
      }
      cardEl.onclick = () => this.handleCardClick(c, cardEl);
      grid.appendChild(cardEl);
    });
  }
};

if (typeof window !== 'undefined') {
  window.MatchGame = MatchGame;
}
