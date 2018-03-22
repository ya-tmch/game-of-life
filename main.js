function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

let app

let cellComponent = {
    template: '#app-cell-template',
    props: ['cell'],
    methods: {
        click() {
            this.cell.alive = !this.cell.alive
        }
    }
}

let appComponent = {
    el: '#app',
    template: '#app-template',
    created() {
        this.initCells()

        // не реактивное поле
        this.history = []
    },
    computed: {
        started() {
            return !!this.interval
        }
    },
    data: {
        interval: null,
        cellSize: '0.8rem',
        rowsCount: 50,
        cellsCount: 50,
        cells: null
    },
    methods: {
        /**
         * Рандомно выбирает клетки.
         */
        random() {
            this.initCells()

            let livingNumber = getRandomInt(100, 500)

            for(let i = 0; i < livingNumber; i++) {

                let x = getRandomInt(5, this.cellsCount - 5)
                let y = getRandomInt(5, this.rowsCount - 5)

                this.cells[x][y].alive = true
            }
        },

        /**
         * Инициализируем массив клеток.
         */
        initCells() {
            let data = []
            for(let x = 0; x < this.rowsCount; x++) {

                let row = []
                for(let y = 0; y < this.cellsCount; y++) {
                    row.push({x, y, alive: false})
                }

                data.push(row)
            }

            this.cells = data
        },

        /**
         * Вызывает обратный вызов для каждой клетки.
         *
         * @param callback
         */
        foreachCells(callback) {
            for(let x = 0; x < this.rowsCount; x++) {
                for(let y = 0; y < this.cellsCount; y++) {
                    callback(this.cells[x][y])
                }
            }
        },

        /**
         * Запускаем жизнь!
         */
        start() {
            if (!this.started) {
                this.interval = setInterval(() => {

                    console.time()
                    this.makeStep()
                    console.timeEnd()

                }, 200)
            }
        },

        /**
         * Останавливаем жизнь!
         */
        stop() {
            clearInterval(this.interval)
            this.interval = null
        },

        /**
         *  Выполняем одну итерацию "жизни".
         */
        makeStep() {
            let changes = []

            this.foreachCells(({x, y, alive}) => {
                let
                    newAliveState

                // Если клетка...
                if (alive) {
                    // ...живая!
                    newAliveState = this.savesLive(x, y)
                } else {
                    // ...не живая!
                    newAliveState = this.comesToLive(x, y)
                }

                // Если состояние клетки изменилось, запоминаем.
                if (alive !== newAliveState) {
                    changes.push({x, y, alive: newAliveState})
                }
            })

            // если изменений нет, то завершаем работу!
            if (!changes.length) {
                this.stop()
            } else {
                this.commitChanges(changes)

                // если новое состояние уже регистрировалось в истории, то конец игры!
                if (this.stateExistsInHistory()) {
                    this.stop()
                } else {
                    // Иначе регистрируем и продолжаем игру
                    this.saveCurrentStateToHistory()
                }
            }
        },

        /**
         * Применяем изменения к массиву.
         *
         * @param changes
         */
        commitChanges(changes) {
            changes.forEach(({x, y, alive}) => {
                this.cells[x][y].alive = alive
            })
        },

        /**
         * Получаем отсортированный массив живых клеток (в виде строки X_Y).
         *
         * @returns {Array}
         */
        getLiving() {
            let living = []

            this.foreachCells(({x, y, alive}) => {
                if (alive) {
                    living.push(`${x}_${y}`)
                }
            })

            return living.sort()
        },

        /**
         * Ищем текущее состояние системы в истории.
         *
         * @returns {boolean}
         */
        stateExistsInHistory() {
            let living = this.getLiving()

            // Перебераем каждое состояние в истории
            for(let i = 0; i < this.history.length; i++) {

                let notEqual = false

                // сравниваем состояние в истории с текущем состоянием,
                for(let j = 0; j < this.history[i].length; j++) {

                    if (this.history[i][j] !== living[j]) {
                        notEqual = true
                        break
                    }
                }

                // Если состояние равно, значит попали в замкнутый круг. Выход!
                if (!notEqual) {
                    return true
                }
            }

            return false
        },

        /**
         * Сохраняем текущее состояние системы в историю.
         */
        saveCurrentStateToHistory() {
            let living = this.getLiving()

            if (living.length) {
                this.history.push(living)

                if (this.history.length > 100) {
                    this.history.shift()
                }
            }
        },

        /**
         * Если true, клетка остается живой.
         * если у живой клетки есть две или три живые соседки, то эта клетка продолжает жить;
         * в противном случае, если соседей меньше двух или больше трёх, клетка умирает.
         *
         * @param x
         * @param y
         */
        savesLive(x, y) {
            let livingNumber = this.getNeighbors(x, y).filter(c => c.alive).length

            return (livingNumber === 2 || livingNumber === 3)
        },

        /**
         * Если true, клетка оживает.
         * в пустой (мёртвой) клетке, рядом с которой ровно три живые клетки, зарождается жизнь.
         *
         * @param x
         * @param y
         */
        comesToLive(x, y) {
            let livingNumber = this.getNeighbors(x, y).filter(c => c.alive).length

            return (livingNumber === 3)
        },

        /**
         * Получить соседей.
         */
        getNeighbors(x, y) {
            let neighbors = []

            for (let i = (x - 1); i <= (x + 1); i++) {
                for (let j = (y - 1); j <= (y + 1); j++) {

                    // Исключаем саму ячейку, для которой мы ищем соседей.
                    if (!(i === x && j === y)) {
                        neighbors.push(this.getCellFromCanvas(i, j))
                    }
                }
            }

            return neighbors
        },

        /**
         * Получить ячейку, с учетом того, что координатная сетка бесконечна.
         * Т.к. всегда берем только соседнии клетки, то выход за границу поля может быть максимум на 1 клетку.
         *
         * @param x
         * @param y
         */
        getCellFromCanvas(x, y) {

            // Если клетка уходит за поле вправо
            if (x >= this.rowsCount) {
                x = 0
            }

            // Если клетка уходит за поле влево
            if (x === -1) {
                x = (this.rowsCount - 1)
            }

            // Если клетка уходит за поле вправо
            if (y >= this.cellsCount) {
                y = 0
            }

            // Если клетка уходит за поле влево
            if (y === -1) {
                y = (this.cellsCount - 1)
            }

            return this.cells[x][y]
        }
    }
}

Vue.component('cell', cellComponent)
app = new Vue(appComponent)

