import _ = require("lodash");
import ko = require("knockout");
import "./css/stacker.less";

namespace stacker {
  export class StackerCol {
    lit = ko.observable(false);
    dead = ko.observable(false);

    constructor() {}
  }

  export class StackerRow {
    cols = ko.observableArray<StackerCol>([]);

    activeRow = ko.observable(false);
    prizeRow = ko.observable(false);

    activeCol = 0;

    cycleTimer = 0;
    leftDirection = false;

    constructor(
      numCols: number,
      public columnSwitchInterval: number,
      public stackWidth: number,
      public prizeCallback?: () => void
    ) {
      for (var i = 0; i < numCols; i++) {
        this.cols.push(new StackerCol());
      }

      this.prizeRow(this.prizeCallback != null);
    }

    startCycle() {
      clearInterval(this.cycleTimer);

      this.activeCol = 0;
      for (var i = 0; i < this.stackWidth; i++) {
        this.cols()[i].lit(true);
      }

      this.cycleTimer = setInterval(() => {
        this.cycleColumn();
      }, this.columnSwitchInterval);
    }

    stopCycle(): rowResult {
      clearInterval(this.cycleTimer);
      return {
        left: this.activeCol,
        right: this.activeCol + this.stackWidth - 1
      };
    }

    cycleColumn() {
      //Light the new active col
      if (this.leftDirection) {
        this.cols()[this.activeCol + this.stackWidth - 1].lit(false);
        this.activeCol--;
        this.cols()[this.activeCol].lit(true);

        if (this.activeCol <= 0) {
          this.leftDirection = false;
        }
      } else {
        this.cols()[this.activeCol].lit(false);
        this.activeCol++;
        this.cols()[this.activeCol + this.stackWidth - 1].lit(true);
        if (this.activeCol + this.stackWidth - 1 >= this.cols().length - 1) {
          this.leftDirection = true;
        }
      }
    }
  }

  var colCount = 7;
  var rowCount = 15;
  interface rowResult {
    left: number;
    right: number;
  }

  export class StackerWidget {
    rows = ko.observableArray<StackerRow>([]);
    activeRow = 0;
    gameRunning = ko.observable(false);

    results: rowResult[] = [];
    raining = ko.observable(false);

    rainInterval = 0;
    rainPhase = 0;

    constructor() {
      this.startRaining();
    }

    rainPatterns = [
      (x, max) => ((max - 1) * Math.sin(x * 2 * Math.PI) + (max - 1)) / 2
    ];

    startRaining() {
      this.raining(true);
      this.initializeGame();

      this.rainInterval = setInterval(() => {
        var spawnPos = this.rainPatterns[0](this.rainPhase, colCount);
        this.rainPhase = this.rainPhase + 1 / rowCount * 0.5;
        if (this.rainPhase > 1) {
          this.rainPhase = 0;
        }

        var tcol = Math.round(spawnPos);

        for (var row = rowCount - 1; row >= 0; row--) {
          var theRow = this.rows()[row];
          theRow.cols()[theRow.activeCol].lit(false);

          if (row == 0) {
            theRow.activeCol = tcol;
            theRow.cols()[theRow.activeCol].lit(true);
          } else {
            //copy from last row
            theRow.activeCol = this.rows()[row - 1].activeCol;
            theRow.cols()[theRow.activeCol].lit(true);
          }
        }
      }, 50);
    }

    stopRaining() {
      this.raining(false);
      clearInterval(this.rainInterval);
      this.initializeGame();
    }

    initializeGame() {
      this.rows([]);
      this.results = [];

      var maxTiming = window.location.hash.indexOf("insane") != -1 ? 100 : 250;
      var minTiming =
        window.location.hash.indexOf("hard") != -1
          ? 10 + Math.random() * 90
          : window.location.hash.indexOf("insane") != -1 ? 1 : 100;
      var timingStep = (maxTiming - minTiming) / rowCount;

      var curTiming = maxTiming;
      for (var row = 0; row < rowCount; row++) {
        this.rows.unshift(
          new StackerRow(
            colCount,
            minTiming +
              (maxTiming - minTiming) *
                Math.pow((rowCount - row) / rowCount, 2),
            row < 4 ? 3 : row < 9 ? 2 : 1,
            row == 10
              ? this.minorPrize.bind(this)
              : row == 14 ? this.majorPrize.bind(this) : null
          )
        );
        //curTiming = minTiming + ;
      }
    }

    startRow(row: StackerRow) {
      row.activeCol = 0;
      for (var i = row.activeCol; i < row.activeCol + row.stackWidth; i++) {
        row.cols()[i].lit(true);
      }
    }

    startGame() {
      if (this.raining()) {
        this.stopRaining();
      }
      if (!this.gameRunning()) {
        this.gameRunning(true);
        for (var row of this.rows()) {
          for (var col of row.cols()) {
            col.lit(false);
            col.dead(false);
          }
          row.leftDirection = false;
          row.activeCol = 0;
        }
        this.activeRow = this.rows().length - 1;
        this.rows()[this.activeRow].activeRow(true);

        this.rows()[this.activeRow].startCycle();
      } else {
        this.nextLevel();
      }
    }

    gameOver() {
      this.gameRunning(false);
      alert("Game over!");
      this.startRaining();
    }

    nextLevel() {
      if (this.gameRunning()) {
        this.results.push(this.rows()[this.activeRow].stopCycle());

        if (this.results.length >= 2) {
          //Cleanup results
          var result = this.results[this.results.length - 1];
          var lastResult = this.results[this.results.length - 2];

          if (result.left < lastResult.left) {
            //Trim left
            var offset = lastResult.left - result.left;

            if (offset >= this.rows()[this.activeRow].stackWidth) {
              this.gameOver();
              return;
            }

            this.rows()[this.activeRow].activeCol =
              this.rows()[this.activeRow].activeCol + offset;
            this.rows()[this.activeRow].stackWidth =
              this.rows()[this.activeRow].stackWidth - offset;
            for (var i = 0; i < offset; i++) {
              this.rows()
                [this.activeRow].cols()
                [result.left + i].lit(false);
              this.rows()
                [this.activeRow].cols()
                [result.left + i].dead(true);
            }
            result.left = lastResult.left;
          }

          if (result.right > lastResult.right) {
            var offset = result.right - lastResult.right;

            if (offset >= this.rows()[this.activeRow].stackWidth) {
              this.gameOver();
              return;
            }

            this.rows()[this.activeRow].stackWidth =
              this.rows()[this.activeRow].stackWidth - offset;

            for (var i = 0; i < offset; i++) {
              this.rows()
                [this.activeRow].cols()
                [result.right - i].lit(false);
              this.rows()
                [this.activeRow].cols()
                [result.right - i].dead(true);
            }
            result.right = lastResult.right;
          }

          if (this.rows()[this.activeRow].prizeRow()) {
            this.rows()[this.activeRow].prizeCallback();
          }
        }

        this.rows()[this.activeRow].activeRow(false);
        this.activeRow--;
        this.rows()[this.activeRow].activeRow(true);
        if (this.activeRow < 0) {
          this.gameRunning(false);
          this.majorPrize();
          return;
        } else {
          //Check lights

          this.rows()[this.activeRow].stackWidth = Math.min(
            this.rows()[this.activeRow].stackWidth,
            this.rows()[this.activeRow + 1].stackWidth
          );
          this.rows()[this.activeRow].startCycle();
        }
      }
    }

    minorPrize() {
      alert("Minor prize!");
    }

    majorPrize() {
      alert("Major prize!");
      //this.gameRunning(false);
      this.startRaining();
    }

    destroyWidgetInternal() {}
  }

  const stacker = new StackerWidget();

  export function runStackerGame() {
    window.addEventListener("load", () => {
      ko.applyBindings(stacker, document.getElementById("stackergame"));
    });

    // window.addEventListener("resize", () => {
    //   stacker.initializeGame();
    // });
  }
  runStackerGame();
}
