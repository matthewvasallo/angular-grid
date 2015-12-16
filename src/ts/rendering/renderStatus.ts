/// <reference path="renderedRow.ts" />
/// <reference path="../columnController.ts" />

module ag.grid {

    var DEFAULT_LEVELS = [{
        h: 0,
        v: 0
    }, {
        h: 5,
        v: 5
    }, {
        h: -1,
        v: 0
    }];

    export class RenderStatus {
        private currentLevel = 0;
        private levels = DEFAULT_LEVELS;
        private levelCount : number;

        private areaToRender : {top: number; left: number; bottom: number; right: number} = null;

        private gridOptionsWrapper: GridOptionsWrapper;
        private gridPanel: GridPanel;
        private rowRenderer: RowRenderer;
        private eBodyViewport: HTMLElement;
        private rowModel: any;
        private columnController: ColumnController;

        public constructor(gridOptionsWrapper: GridOptionsWrapper, gridPanel: GridPanel, rowRenderer: RowRenderer,
                           columnController: ColumnController, eBodyViewport: HTMLElement)
        {
            this.gridOptionsWrapper = gridOptionsWrapper;
            this.gridPanel = gridPanel;
            this.rowRenderer = rowRenderer;
            this.eBodyViewport = eBodyViewport;
            this.columnController = columnController;

            if (gridOptionsWrapper.getBufferLevels()) {
                this.levels = gridOptionsWrapper.getBufferLevels();
            }

            this.levelCount = this.levels.length;
        }

        public setRowModel(rowModel: any) {
            this.rowModel = rowModel;
        }

        public getAreaToRender() : any {
            if (this.areaToRender === null) {
                this.areaToRender = {
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0
                };
                this.computeAreaToRender();
            }
            return this.areaToRender;
        }

        public isLevelLessThanMax() : boolean {
            return this.currentLevel < this.levelCount;
        }

        public resetLevel() {
            this.currentLevel = 0;
            this.areaToRender = null;
        }

        public nextLevel() {
            if (this.currentLevel < this.levelCount) {
                this.currentLevel++;
                this.areaToRender = null;
            }
        }

        private computeAreaToRender() {
            var first: number;
            var last: number;
            var rowCount = this.rowModel.getVirtualRowCount();

            var vBuffer = this.levels[this.currentLevel].v;
            if (vBuffer < 0 || this.gridOptionsWrapper.isForPrint()) {
                first = 0;
                last = rowCount - 1;
            } else {
                var topPixel = this.eBodyViewport.scrollTop;
                var bottomPixel = topPixel + this.eBodyViewport.offsetHeight;

                first = Math.floor(topPixel / this.gridOptionsWrapper.getRowHeight());
                last = Math.floor(bottomPixel / this.gridOptionsWrapper.getRowHeight());

                //add in buffer
                first = first - vBuffer;
                last = last + vBuffer;

                // adjust, in case buffer extended actual size
                if (first < 0) {
                    first = 0;
                }
                if (last > rowCount - 1) {
                    last = rowCount - 1;
                }
            }

            this.areaToRender.top = first;
            this.areaToRender.bottom = last;

            var columns = this.columnController.getDisplayedColumns();
            var pinnedColCount = this.gridOptionsWrapper.getPinnedColCount();
            var viewportLeftPixel = this.eBodyViewport.scrollLeft;
            var viewportRightPixel = viewportLeftPixel + this.eBodyViewport.offsetWidth;

            var hBuffer = this.levels[this.currentLevel].h;
            if (hBuffer < 0) {
                first = 0;
                last = columns.length;
            } else {
                var firstColumnOnScreen = this.columnController.getColumnForOffset(viewportLeftPixel) - 1;
                var lastColumnOnScreen  =this.columnController.getColumnForOffset(viewportRightPixel) + 1;

                first = firstColumnOnScreen - hBuffer;
                last = lastColumnOnScreen + hBuffer;
            }

            if (first < 0) {
                first = 0;
            }
            if (last > columns.length) {
                last = columns.length;
            }

            this.areaToRender.left = first;
            this.areaToRender.right = last;
        }
    }
}
