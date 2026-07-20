//Author Bianca Levarios

//it gives the start game button a function
var number_mvs = 0;
var game_started = false;

//which tiles are adjacent to which, used by switching()
var neighbors = {
    p1: ['p2', 'p4'],
    p2: ['p1', 'p3', 'p5'],
    p3: ['p2', 'p6'],
    p4: ['p1', 'p5', 'p7'],
    p5: ['p2', 'p4', 'p6', 'p8'],
    p6: ['p3', 'p5', 'p9'],
    p7: ['p4', 'p8'],
    p8: ['p5', 'p7', 'p9'],
    p9: ['p6', 'p8']
};

function start_game() {
    document.getElementById('tab_grid').style.background = '';

    //start from the solved board so the shuffle below can only reach solvable states
    //(a fully random permutation is unsolvable half the time)
    for (var i = 1; i <= 9; i++) {
        var cell = document.getElementById('p' + i);
        cell.style.visibility = 'visible';
        cell.textContent = String(i);
        cell.style.background = 'url(./' + i + '.png) center/cover no-repeat';
    }

    //scramble with random legal moves of the blank tile ('1'), never undoing the last move
    var blank = 'p1';
    var previous = null;
    for (var m = 0; m < 150; m++) {
        var options = neighbors[blank].filter(function (id) { return id !== previous; });
        var next = options[Math.floor(Math.random() * options.length)];
        swap_cells(blank, next);
        previous = blank;
        blank = next;
    }

    //reshuffle again if it happened to already be solved
    if (check_win()) {
        start_game();
        return;
    }

    /*resets moves count*/
    document.getElementById('moves').textContent = "Moves: 0";
    number_mvs = 0;
    document.getElementById('launch').textContent = 'Restart Game';

    game_started = true;
    document.getElementById('tab_grid').classList.remove('locked');
}

function check_win() {
    for (var i = 1; i <= 9; i++) {
        if (document.getElementById('p' + i).textContent != String(i)) {
            return false;
        }
    }
    return true;
}

function reset_images() {
    for (var i = 1; i <= 9; i++) {
        document.getElementById('p' + i).style.visibility = 'visible';
    }

    document.getElementById('launch').textContent = 'Start Game';
    number_mvs = 0;
    document.getElementById('moves').textContent = 'Moves: 0';

    game_started = false;
    document.getElementById('tab_grid').classList.add('locked');
}

function back_to_normal() {
    document.getElementById('tab_grid').style.background = 'url(./10.png) center/cover no-repeat';

    setTimeout(reset_images, 5000);
}

function win_sequence() {
    game_started = false;
    if (window.Arcade) Arcade.gameOver(number_mvs);

    setTimeout(function () {
        for (var i = 1; i <= 9; i++) {
            document.getElementById('p' + i).style.visibility = 'hidden';
        }
        document.getElementById('tab_grid').style.background = 'url(./youwon.gif) center/cover no-repeat';

        setTimeout(back_to_normal, 5000);
    }, 500);
}

//swaps the contents of two cells without counting a move (used by the shuffle)
function swap_cells(a, b) {
    var elA = document.getElementById(a);
    var elB = document.getElementById(b);

    var temp_val = elA.textContent;
    elA.textContent = elB.textContent;
    elB.textContent = temp_val;

    elA.style.background = 'url(./' + elA.textContent + '.png) center/cover no-repeat';
    elB.style.background = 'url(./' + elB.textContent + '.png) center/cover no-repeat';
}

//swaps two tiles, updates their images, and counts the move
function swap_tiles(a, b) {
    swap_cells(a, b);

    number_mvs++;
    document.getElementById('moves').textContent = "Moves: " + number_mvs;
}

//switches game images onclick
function switching(cell) {
    if (!game_started) {
        return;
    }

    if (document.getElementById(cell).textContent == '1') {
        return;
    }

    neighbors[cell].forEach(function (neighborId) {
        if (document.getElementById(neighborId).textContent == '1') {
            swap_tiles(cell, neighborId);
        }
    });

    if (check_win()) {
        win_sequence();
    }
}