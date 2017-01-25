/// <reference path='../columnController.ts' />
/// <reference path='../utils.ts' />
/// <reference path="../gridOptionsWrapper.ts" />
/// <reference path="../expressionService.ts" />
/// <reference path="../selectionRendererFactory.ts" />
/// <reference path="rowRenderer.ts" />
/// <reference path="../selectionController.ts" />
/// <reference path="../templateService.ts" />
/// <reference path="../virtualDom/vHtmlElement.ts" />
/// <reference path="../virtualDom/vWrapperElement.ts" />

module ag.grid {

    var _ = Utils;

    export class RenderedCell {

        private vGridCell: ag.vdom.VHtmlElement; // the outer cell
        private vSpanWithValue: ag.vdom.VHtmlElement; // inner cell
        private vCellWrapper: ag.vdom.VHtmlElement;
        private vParentOfValue: ag.vdom.VHtmlElement;

        private checkboxOnChangeListener: EventListener;

        private column: Column;
        private data: any;
        private node: RowNode;
        private rowIndex: number;
        private editingCell: boolean;
        private editCell: any;
        private currentClasses: string[] = [];

        private scope: any;
        private isFirstColumn: boolean = false;

        private gridOptionsWrapper: GridOptionsWrapper;
        private expressionService: ExpressionService;
        private selectionRendererFactory: SelectionRendererFactory;
        private rowRenderer: RowRenderer;
        private selectionController: SelectionController;
        private $compile: any;
        private templateService: TemplateService;
        private cellRendererMap: {[key: string]: Function};
        private eCheckbox: HTMLInputElement;
        private columnController: ColumnController;
        private valueService: ValueService;
        private eventService: EventService;

        private value: any;
        private checkboxSelection: boolean;
        private blurListener: Function = null;
        private keyListener: Function = null;

        constructor(isFirstColumn: any, column: any, $compile: any, rowRenderer: RowRenderer,
                    gridOptionsWrapper: GridOptionsWrapper, expressionService: ExpressionService,
                    selectionRendererFactory: SelectionRendererFactory, selectionController: SelectionController,
                    templateService: TemplateService, cellRendererMap: {[key: string]: any},
                    node: any, rowIndex: number, scope: any, columnController: ColumnController,
                    valueService: ValueService, eventService: EventService) {

            this.isFirstColumn = isFirstColumn;
            this.column = column;
            this.rowRenderer = rowRenderer;
            this.gridOptionsWrapper = gridOptionsWrapper;
            this.expressionService = expressionService;
            this.selectionRendererFactory = selectionRendererFactory;
            this.selectionController = selectionController;
            this.cellRendererMap = cellRendererMap;
            this.$compile = $compile;
            this.templateService = templateService;
            this.columnController = columnController;
            this.valueService = valueService;
            this.eventService = eventService;

            this.checkboxSelection = this.column.colDef.checkboxSelection && !node.floating;

            this.node = node;
            this.rowIndex = rowIndex;
            this.scope = scope;
            this.data = this.getDataForRow();
            this.value = this.getValue();

            this.setupComponents();
        }

        public getColumn(): Column {
            return this.column;
        }

        private getValue(): any {
            return this.valueService.getValue(this.column.colDef, this.data, this.node);
        }

        public getVGridCell(): ag.vdom.VHtmlElement {
            return this.vGridCell;
        }

        private getDataForRow() {
            if (this.node.footer) {
                // if footer, we always show the data
                return this.node.data;
            } else if (this.node.group) {
                // if header and header is expanded, we show data in footer only
                var footersEnabled = this.gridOptionsWrapper.isGroupIncludeFooter();
                var suppressHideHeader = this.gridOptionsWrapper.isGroupSuppressBlankHeader();
                if (this.node.expanded && footersEnabled && !suppressHideHeader) {
                    return undefined;
                } else {
                    return this.node.data;
                }
            } else {
                // otherwise it's a normal node, just return data as normal
                return this.node.data;
            }
        }

        private setupComponents() {
            this.vGridCell = new ag.vdom.VHtmlElement("div");
            this.vGridCell.setAttribute("col", (this.column.index !== undefined && this.column.index !== null) ? this.column.index.toString() : '');

            this.vGridCell.setAttribute("colId", this.column.colId);

            // only set tab index if cell selection is enabled
            if (!this.gridOptionsWrapper.isSuppressCellSelection() && !this.node.floating) {
                this.vGridCell.setAttribute("tabindex", "-1");
            }

            // these are the grid styles, don't change between soft refreshes
            this.addClasses();

            this.addCellClickedHandler();
            this.addCellDoubleClickedHandler();
            this.addCellContextMenuHandler();
            this.addCellHoverHandler();

            if (!this.node.floating) { // not allowing navigation on the floating until i have time to figure it out
                this.addCellNavigationHandler();
            }

            this.vGridCell.addStyles({width:  Utils.addPxIfNumber(this.column.actualWidth)});

            this.createParentOfValue();

            this.populateCell();

            if (this.eCheckbox) {
                this.setSelected(this.selectionController.isNodeSelected(this.node));
            }

        }

        // Cengage addition
        public useEditCellRenderer(container: any) : void {
            var colDef : ColDef = this.column.colDef;
            var rendererParams = {
                value: this.getValue(),
                data: this.data,
                node: this.node,
                colDef: colDef,
                column: this.column,
                $scope: this.scope,
                rowIndex: this.rowIndex,
                api: this.gridOptionsWrapper.getApi(),
                context: this.gridOptionsWrapper.getContext()
            };

            var editRenderer = colDef.editCellRenderer;
            var resultFromRenderer = editRenderer(rendererParams);

            //return resultFromRenderer;
            if (Utils.isNodeOrElement(resultFromRenderer)) {
                container.appendChild(resultFromRenderer)
            } else {
                container.innerHTML = resultFromRenderer;
            }
        }

        private makeEditCell() : any {
            var editLayer = this.rowRenderer.getEditLayer();
            this.rowRenderer.setRowPosition(editLayer, this.rowIndex);

            var div = document.createElement("div");
            var style : any = div.style;
            style.position = "absolute";
            style.top = "0px";

            var columnIndex = this.columnController.getDisplayedColIndex(this.column);
            style.left = Utils.addPxIfNumber(this.columnController.getOffsetForColumnIndex(columnIndex));

            editLayer.appendChild(div);
            this.editCell = div;

            return div;
        }

        public adjustPositionIfNeed(left: number): void {
            var currentStr = this.vGridCell.getStyle("left");
            var current = new Number(currentStr.replace(/px/, ""));
            if (current !== left) {
                this.vGridCell.addStyles({
                    left: left + "px"
                });
            }
        }

        // called by rowRenderer when user navigates via tab key
        public startEditing(key?: number) {
            var that = this;
            this.editingCell = true;
            this.rowRenderer.setEditInProgress(true);
            this.cellEnterExitHandler(true);
            var eInput : any, nodeToAppend : any;

            if (this.column.colDef.editCellRenderer) {
                nodeToAppend = document.createElement('span');
                this.useEditCellRenderer(nodeToAppend);
                eInput = nodeToAppend.querySelector('input');
            } else {
                eInput = document.createElement('input');
                eInput.type = 'text';
                _.addCssClass(eInput, 'ag-cell-edit-input');
                var startWithOldValue = key !== Constants.KEY_BACKSPACE && key !== Constants.KEY_DELETE;
                var value = this.getValue();
                if (startWithOldValue && value !== null && value !== undefined) {
                    eInput.value = value;
                }

                eInput.style.width = (this.column.actualWidth - 14) + 'px';
                nodeToAppend = eInput;
            }

            this.makeEditCell().appendChild(nodeToAppend);

             this.blurListener = function () {
                var params = {
                    endEdit: true,
                    abortIfInvalid: true
                };
                that.stopEditing(eInput, params);
            };

            //stop entering if we loose focus
            eInput.addEventListener("blur", this.blurListener);

            var customKeyMap = this.gridOptionsWrapper.getEditKeyMap();
            this.keyListener = function(event: any) {
                var key = event.which || event.keyCode;
                var keyDefinition = customKeyMap[key] || Constants.DEFAULT_KEY_MAP[key];
                if (keyDefinition) {
                    var params = keyDefinition[event.shiftKey ? "shift" : "noShift"];
                    if (params) {
                        that.stopEditing(eInput, params);
                    }

                    // we don't want the default action, so return false, this stops the event from bubbling
                    event.preventDefault();
                    return false;
                }
            };
            eInput.addEventListener('keydown', this.keyListener);

            var colIndex = this.columnController.getDisplayedColIndex(this.column);
            if (colIndex >= 0) {
                this.rowRenderer.getGridPanel().ensureColIndexVisible(colIndex, this.column.colDef.editWidth);
            }

            eInput.focus();
            eInput.select();
        }

        public focusCell(forceBrowserFocus: boolean): void {
            this.rowRenderer.focusCell(this.vGridCell.getElement(), this.rowIndex, this.column.index, this.column.colDef, forceBrowserFocus);
        }

        private stopEditing(eInput: any, params: any): boolean {
            var newValue = eInput.value;
            var colDef = this.column.colDef;
            var paramsForCallbacks = {
                node: this.node,
                data: this.node.data,
                oldValue: this.node.data[colDef.field],
                newValue: newValue,
                rowIndex: this.rowIndex,
                colDef: colDef,
                api: this.gridOptionsWrapper.getApi(),
                context: this.gridOptionsWrapper.getContext()
            };

            if (!params.abortEdit && colDef.newValueValidator) {
                if (!colDef.newValueValidator(paramsForCallbacks)) {
                    if (!params.abortIfInvalid) {
                        return false;
                    }
                    params.abortEdit = true;
                }
            }

            if (colDef.confirmEditHandler && !params.editConfirmed && !params.abortEdit) {
                this.callConfirmEdit(colDef.confirmEditHandler, eInput, params, paramsForCallbacks);
                return false;
            }

            this.editingCell = false;
            this.rowRenderer.setEditInProgress(false);
            this.cellEnterExitHandler(false);

            //If we don't remove the blur listener first, we get:
            //Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is no longer a child of this node. Perhaps it was moved in a 'blur' event handler?
            eInput.removeEventListener('blur', this.blurListener);

            if (!params.abortEdit) {

                if (colDef.newValueHandler) {
                    colDef.newValueHandler(paramsForCallbacks);
                } else {
                    this.node.data[colDef.field] = newValue;
                }

                // at this point, the value has been updated
                this.value = this.getValue();

                paramsForCallbacks.newValue = this.value;
                if (typeof colDef.onCellValueChanged === 'function') {
                    colDef.onCellValueChanged(paramsForCallbacks);
                }
                this.eventService.dispatchEvent(Events.EVENT_CELL_VALUE_CHANGED, paramsForCallbacks);
            }

            if (this.checkboxSelection) {
                this.vGridCell.appendChild(this.vCellWrapper.getElement());
            }

            if (this.editCell) {
                _.removeAllChildren(this.editCell);
                var editLayer = this.rowRenderer.getEditLayer();
                editLayer.removeChild(this.editCell);
                this.rowRenderer.setRowPosition(editLayer, -10);
                this.editCell = null;
            }
            this.refreshCell();

            if (!params.abortEdit && !params.endEdit) {
                this.rowRenderer.selectNextEditCellByParameters(this.rowIndex, this.column, params);
            }

            return true;
        }

        private callConfirmEdit(handler: any, eInput: any, editParams: any, paramsForCallbacks: any): void {
            var that = this;
            var confirmParams = _.cloneObject(editParams);
            confirmParams.editConfirmed = true;
            eInput.removeEventListener('blur', this.blurListener);
            eInput.removeEventListener('keydown', this.keyListener);
            eInput.blur();

            var confirm = function() {
                that.stopEditing(eInput, confirmParams);
            };
            var dismiss = function() {
                confirmParams.abortEdit = true;
                that.stopEditing(eInput, confirmParams);
                if (!editParams.endEdit) {
                    that.rowRenderer.selectNextEditCellByParameters(that.rowIndex, that.column, editParams);
                }
            };
            var finish = function() {
                eInput.addEventListener('blur', that.blurListener);
                eInput.addEventListener('keydown', that.keyListener);
            };
            paramsForCallbacks.confirmCallback = confirm;
            paramsForCallbacks.dismissCallback = dismiss;
            paramsForCallbacks.finishCallback = finish;

            handler(paramsForCallbacks);
        }

        private createParams(): any {
            var params = {
                node: this.node,
                data: this.node.data,
                value: this.value,
                rowIndex: this.rowIndex,
                colDef: this.column.colDef,
                $scope: this.scope,
                context: this.gridOptionsWrapper.getContext(),
                api: this.gridOptionsWrapper.getApi()
            };
            return params;
        }

        private createEvent(event: any, eventSource: any): any {
            var agEvent = this.createParams();
            agEvent.event = event;
            agEvent.eventSource = eventSource;
            return agEvent;
        }

        private addCellDoubleClickedHandler() {
            var that = this;
            var colDef = this.column.colDef;
            this.vGridCell.addEventListener('dblclick', function (event: any) {
                // always dispatch event to eventService
                var agEvent: any = that.createEvent(event, this);
                that.eventService.dispatchEvent(Events.EVENT_CELL_DOUBLE_CLICKED, agEvent);

                // check if colDef also wants to handle event
                if (typeof colDef.onCellDoubleClicked === 'function') {
                    colDef.onCellDoubleClicked(agEvent);
                }

                if (!that.gridOptionsWrapper.isSingleClickEdit() && that.isCellEditable()) {
                    that.startEditing();
                }
            });
        }

        private addCellContextMenuHandler() {
            var that = this;
            var colDef = this.column.colDef;
            this.vGridCell.addEventListener('contextmenu', function (event: any) {
                var agEvent: any = that.createEvent(event, this);
                that.eventService.dispatchEvent(Events.EVENT_CELL_CONTEXT_MENU, agEvent);

                if (colDef.onCellContextMenu) {
                    colDef.onCellContextMenu(agEvent);
                }
            });
        }

        public isCellEditable() {
            if (this.editingCell) {
                return false;
            }

            // never allow editing of groups
            if (this.node.group) {
                return false;
            }

            // if boolean set, then just use it
            var colDef = this.column.colDef;
            if (typeof colDef.editable === 'boolean') {
                return colDef.editable;
            }

            // if function, then call the function to find out
            if (typeof colDef.editable === 'function') {
                var params = this.createParams();
                var editableFunc = <Function>colDef.editable;
                return editableFunc(params);
            }

            return false;
        }

        private addCellClickedHandler() {
            var colDef = this.column.colDef;
            var that = this;
            this.vGridCell.addEventListener("click", function (event: any) {
                // we pass false to focusCell, as we don't want the cell to focus
                // also get the browser focus. if we did, then the cellRenderer could
                // have a text field in it, for example, and as the user clicks on the
                // text field, the text field, the focus doesn't get to the text
                // field, instead to goes to the div behind, making it impossible to
                // select the text field.
                if (!that.node.floating) {
                    that.focusCell(false);
                }
                var agEvent = that.createEvent(event, this);
                that.eventService.dispatchEvent(Events.EVENT_CELL_CLICKED, agEvent);
                if (colDef.onCellClicked) {
                    colDef.onCellClicked(agEvent);
                }

                if (that.gridOptionsWrapper.isSingleClickEdit() && that.isCellEditable()) {
                    that.startEditing();
                }
            });
        }

        private cellEnterExitHandler(entering: boolean, event = {}) {
            var colDef = this.column.colDef;
            var hoverHandler = colDef.cellHoverHandler;

            if (hoverHandler) {
                var hoverParams = {
                    colDef: colDef,
                    event: event,
                    entering: entering,
                    leaving: !entering,
                    rowIndex: this.rowIndex,
                    value: this.getValue(),
                    context: this.gridOptionsWrapper.getContext(),
                    api: this.gridOptionsWrapper.getApi()
                };
                hoverHandler(hoverParams);
            }
        }

        private addCellHoverHandler() {
            var that = this;
            var colDef = this.column.colDef;
            var hoverHandler = colDef.cellHoverHandler;

            if (hoverHandler) {
                var callHandler = function(entering: boolean, event: any) {
                    if (that.rowRenderer.isEditInProgress()) {
                        return;
                    }
                    that.cellEnterExitHandler(entering, event);
                };
                this.vGridCell.addEventListener("mouseenter", function(e: any) {
                    callHandler(true, e);
                });
                this.vGridCell.addEventListener("mouseleave", function(e: any) {
                    callHandler(false, e);
                });
            }
        }

        private addTOClassList(classList: string[], toAdd: any): void {
            if (!toAdd || toAdd === "") {
                return;
            }

            var addClass = <Function> (item: string) => {
                    classList.push(item);
            };
            if (Array.isArray(toAdd)) {
                toAdd.forEach(addClass);
            } else {
                toAdd.split(' ').forEach(addClass);
            }
        }

        private populateCell() {
            var newClasses: string[] = [];
            // populate
            this.putDataIntoCell();
            // style
            this.addStylesFromCollDef();
            this.addClassesFromCollDef(newClasses);
            this.addClassesFromRules(newClasses);

            this.updateClasses(newClasses);
        }

        private updateClasses(newClasses: string[]) {
            this.currentClasses.forEach((className: string) => {
                if (newClasses.indexOf(className) < 0) {
                    this.vGridCell.removeClass(className);
                }
            });
            newClasses.forEach((className: string) => {
                if (this.currentClasses.indexOf(className) < 0) {
                    this.vGridCell.addClass(className);
                }
            });

            this.currentClasses = newClasses;
        }

        private addStylesFromCollDef() {
            var colDef = this.column.colDef;
            if (colDef.cellStyle) {
                var cssToUse: any;
                if (typeof colDef.cellStyle === 'function') {
                    var cellStyleParams = {
                        value: this.value,
                        data: this.node.data,
                        node: this.node,
                        colDef: colDef,
                        column: this.column,
                        $scope: this.scope,
                        context: this.gridOptionsWrapper.getContext(),
                        api: this.gridOptionsWrapper.getApi()
                  };             
                    var cellStyleFunc = <Function>colDef.cellStyle;     
                    cssToUse = cellStyleFunc(cellStyleParams);
                } else {
                    cssToUse = colDef.cellStyle;
                }

                if (cssToUse) {
                    this.vGridCell.addStyles(cssToUse);
                }
            }
        }

        private addClassesFromCollDef(classList: string[]) {
            var colDef = this.column.colDef;
            if (colDef.cellClass) {
              var classToUse: any;

                if (typeof colDef.cellClass === 'function') {
                    var cellClassParams = {
                        value: this.value,
                        data: this.node.data,
                        node: this.node,
                        colDef: colDef,
                        $scope: this.scope,
                        context: this.gridOptionsWrapper.getContext(),
                        api: this.gridOptionsWrapper.getApi()
                    };
                    var cellClassFunc = <(cellClassParams: any) => string|string[]> colDef.cellClass;
                    classToUse = cellClassFunc(cellClassParams);
                } else {
                    classToUse = colDef.cellClass;
                }

                this.addTOClassList(classList, classToUse);
            }
        }

        private addClassesFromRules(classList: string[]) {
            var colDef = this.column.colDef;
            var classRules = colDef.cellClassRules;
            if (typeof classRules === 'object' && classRules !== null) {

                var params = {
                    value: this.value,
                    data: this.node.data,
                    node: this.node,
                    colDef: colDef,
                    rowIndex: this.rowIndex,
                    api: this.gridOptionsWrapper.getApi(),
                    context: this.gridOptionsWrapper.getContext()
                };

                var classNames = Object.keys(classRules);
                for (var i = 0; i < classNames.length; i++) {
                    var className = classNames[i];
                    var rule = classRules[className];
                    var resultOfRule: any;
                    if (typeof rule === 'string') {
                        resultOfRule = this.expressionService.evaluate(rule, params);
                    } else if (typeof rule === 'function') {
                        resultOfRule = rule(params);
                    }
                    if (resultOfRule) {
                        this.addTOClassList(classList, className);
                    }
                }
            }
        }

        // rename this to 'add key event listener
        private addCellNavigationHandler() {
            var that = this;
            this.vGridCell.addEventListener('keydown', function (event: any) {
                if (that.editingCell) {
                    return;
                }
                // only interested on key presses that are directly on this element, not any children elements. this
                // stops navigation if the user is in, for example, a text field inside the cell, and user hits
                // on of the keys we are looking for.
                if (event.target !== that.vGridCell.getElement()) {
                    return;
                }

                var key = event.which || event.keyCode;

                var startNavigation = key === Constants.KEY_DOWN || key === Constants.KEY_UP
                    || key === Constants.KEY_LEFT || key === Constants.KEY_RIGHT;
                if (startNavigation) {
                    event.preventDefault();
                    that.rowRenderer.navigateToNextCell(key, that.rowIndex, that.column);
                    return;
                }

                var startEdit = that.isKeycodeForStartEditing(key);
                if (startEdit && that.isCellEditable()) {
                    that.startEditing(key);
                    // if we don't prevent default, then the editor that get displayed also picks up the 'enter key'
                    // press, and stops editing immediately, hence giving he user experience that nothing happened
                    event.preventDefault();
                    return;
                }

                var selectRow = key === Constants.KEY_SPACE;
                if (selectRow && that.gridOptionsWrapper.isRowSelection()) {
                    var selected = that.selectionController.isNodeSelected(that.node);
                    if (selected) {
                        that.selectionController.deselectNode(that.node);
                    } else {
                        that.selectionController.selectNode(that.node, true);
                    }
                    event.preventDefault();
                    return;
                }
            });
        }

        private isKeycodeForStartEditing(key: number): boolean {
            return key === Constants.KEY_ENTER || key === Constants.KEY_BACKSPACE || key === Constants.KEY_DELETE;
        }

        public createSelectionCheckbox() {

            this.eCheckbox = document.createElement('input');
            this.eCheckbox.type = "checkbox";
            this.eCheckbox.name = "name";
            this.eCheckbox.className = 'ag-selection-checkbox';

            this.eCheckbox.addEventListener('click', function (event) {
                event.stopPropagation();
            });

            var that = this;
            this.checkboxOnChangeListener = function() {
                var newValue = that.eCheckbox.checked;
                if (newValue) {
                    that.selectionController.selectIndex(that.rowIndex, true);
                } else {
                    that.selectionController.deselectIndex(that.rowIndex);
                }
            };
            this.eCheckbox.onchange = this.checkboxOnChangeListener;
        }

        public setSelected(state: boolean) {
            if (!this.eCheckbox) {
                return;
            }
            this.eCheckbox.onchange = null;
            if (typeof state === 'boolean') {
                this.eCheckbox.checked = state;
                this.eCheckbox.indeterminate = false;
            } else {
                // isNodeSelected returns back undefined if it's a group and the children
                // are a mix of selected and unselected
                this.eCheckbox.indeterminate = true;
            }
            this.eCheckbox.onchange = this.checkboxOnChangeListener;
        }

        private createParentOfValue() {
            if (this.checkboxSelection) {
                this.vCellWrapper = new ag.vdom.VHtmlElement('span');
                this.vCellWrapper.addClass('ag-cell-wrapper');
                this.vGridCell.appendChild(this.vCellWrapper);

                this.createSelectionCheckbox();
                this.vCellWrapper.appendChild(new ag.vdom.VWrapperElement(this.eCheckbox));

                // eventually we call eSpanWithValue.innerHTML = xxx, so cannot include the checkbox (above) in this span
                this.vSpanWithValue = new ag.vdom.VHtmlElement('span');
                this.vSpanWithValue.addClass('ag-cell-value');

                this.vCellWrapper.appendChild(this.vSpanWithValue);

                this.vParentOfValue = this.vSpanWithValue;
            } else {
                this.vGridCell.addClass('ag-cell-value');
                this.vParentOfValue = this.vGridCell;
            }
        }

        public isVolatile() {
            return this.column.colDef.volatile;
        }

        public refreshCell() {
            if (this.editingCell) {
                // in our environment, a SSE might trigger a refresh while the user is editting the cell;
                // we don't want them to get booted out of edit mode.
                return;
            }

            _.removeAllChildren(this.vParentOfValue.getElement());
            this.value = this.getValue();

            this.populateCell();

            if (this.checkboxSelection) {
                this.setSelected(this.selectionController.isNodeSelected(this.node));
            }

            // if angular compiling, then need to also compile the cell again (angular compiling sucks, please wait...)
            if (this.gridOptionsWrapper.isAngularCompileRows()) {
                this.$compile(this.vGridCell.getElement())(this.scope);
            }
        }

        private putDataIntoCell() {
            // template gets preference, then cellRenderer, then do it ourselves
            var colDef = this.column.colDef;
            if (colDef.template) {
                this.vParentOfValue.setInnerHtml(colDef.template);
            } else if (colDef.templateUrl) {
                var template = this.templateService.getTemplate(colDef.templateUrl, this.refreshCell.bind(this, true));
                if (template) {
                    this.vParentOfValue.setInnerHtml(template);
                }
            } else if (colDef.floatingCellRenderer && this.node.floating) {
                this.useCellRenderer(colDef.floatingCellRenderer);
            } else if (colDef.cellRenderer) {
                this.useCellRenderer(colDef.cellRenderer);
            } else {
                // if we insert undefined, then it displays as the string 'undefined', ugly!
                if (this.value !== undefined && this.value !== null && this.value !== '') {
                    this.vParentOfValue.setInnerHtml(this.value.toString());
                }
            }
        }

        private useCellRenderer(cellRenderer: Function | {}) {
            var colDef = this.column.colDef;

            var rendererParams = {
                value: this.value,
                valueGetter: this.getValue,
                data: this.node.data,
                node: this.node,
                colDef: colDef,
                column: this.column,
                $scope: this.scope,
                rowIndex: this.rowIndex,
                api: this.gridOptionsWrapper.getApi(),
                context: this.gridOptionsWrapper.getContext(),
                refreshCell: this.refreshCell.bind(this),
                eGridCell: this.vGridCell
            };
            // start duplicated code
            var actualCellRenderer: Function;
            if (typeof cellRenderer === 'object' && cellRenderer !== null) {
                var cellRendererObj = <{ renderer: string }> cellRenderer;
                actualCellRenderer = this.cellRendererMap[cellRendererObj.renderer];
                if (!actualCellRenderer) {
                    throw 'Cell renderer ' + cellRenderer + ' not found, available are ' + Object.keys(this.cellRendererMap);
                }
            } else if (typeof cellRenderer === 'function') {
                actualCellRenderer = <Function>cellRenderer;
            } else {
                throw 'Cell Renderer must be String or Function';
            }
            var resultFromRenderer = actualCellRenderer(rendererParams);
            // end duplicated code
            if (_.isNodeOrElement(resultFromRenderer)) {
                // a dom node or element was returned, so add child
                this.vParentOfValue.appendChild(resultFromRenderer);
            } else {
                // otherwise assume it was html, so just insert
                this.vParentOfValue.setInnerHtml(resultFromRenderer);
            }
        }

        private addClasses() {
            this.vGridCell.addClass('ag-cell');
            this.vGridCell.addClass('ag-cell-no-focus');
            this.vGridCell.addClass('cell-col-' + this.column.index);

            if (this.node.group && this.node.footer) {
                this.vGridCell.addClass('ag-footer-cell');
            }
            if (this.node.group && !this.node.footer) {
                this.vGridCell.addClass('ag-group-cell');
            }
        }

    }

}
