/*
 * Copyright (c) 2014 Francisco Salavert (SGL-CIPF)
 * Copyright (c) 2014 Alejandro Alemán (SGL-CIPF)
 * Copyright (c) 2014 Ignacio Medina (EBI-EMBL)
 * Copyright (c) 2014 Jag Kandasamy (EBI-EMBL)
 *
 * This file is part of EVA.
 *
 * EVA is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * EVA is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EVA. If not, see <http://www.gnu.org/licenses/>.
 */
function EvaGenomeViewerPanel(args) {
    var _this = this;
    _.extend(this, Backbone.Events);
    this.id = Utils.genId("GenomeViewerPanel");
    this.target;
    this.tools = [];
    this.position = '13:32889547-32889675';
    _.extend(this, args);
    this.rendered = false;
    if (this.autoRender) {
        this.render();
    }
};


EvaGenomeViewerPanel.prototype = {
    render: function () {
        var _this = this;
        if (!this.rendered) {
            this.div = document.createElement('div');
            this.div.setAttribute('id', this.id);

            this.formDiv = document.createElement('div');
            this.formDiv.setAttribute('class', 'form');

            this.genomeViewerDiv = document.createElement('div');
            this.genomeViewerDiv.setAttribute('class', 'genome-viewer');
            this.genomeViewerDiv.style.border = "1px solid #d3d3d3";
            //this.genomeViewerDiv.style.marginTop = "10px";

            this.div.appendChild(this.formDiv);
            this.div.appendChild(this.genomeViewerDiv);

            this.rendered = true;
        }

    },
    draw: function () {
        if (!this.rendered) {
            this.render();
        }
        this.targetDiv = (this.target instanceof HTMLElement ) ? this.target : document.querySelector('#' + this.target);
        if (!this.targetDiv) {
            console.log('EVAGenomeViewerPanel target not found');
            return;
        }
        this.formDiv.innerHTML = '<div class="jumbotron" style="height:120px;"><h2 style="margin-top:-30px;">Beta Version</h2><p style="font-size:12px;">This is a beta version and we seek feedback from our users. Please contact <a href="mailto:eva-helpdesk@ebi.ac.uk" target="_top">eva-helpdesk@ebi.ac.uk</a> with all suggestions, bug reports and feature requests.</p></div>';
        this.targetDiv.appendChild(this.div);


        this.formPanel = this._createFormPanelGenomeFilter(this.formDiv);
        this.formPanel.draw();

        this.genomeViewer = this._createGenomeViewer(this.genomeViewerDiv);
        this.genomeViewer.draw();
    },
    show: function () {
        this.div.style.display = '';
    },
    hide: function () {
        this.div.style.display = 'none';
    },
    toggle: function () {
        if (this.div.style.display == '') {
            this.hide();
        } else {
            this.show();
        }
    },
    _createFormPanelGenomeFilter: function (target) {
        var _this = this;
        var positionFilter = new PositionFilterFormPanel();

        var speciesFilter = new SpeciesFilterFormPanel({
            title: false,
            collapsible: false
        });

        this.studiesStore = Ext.create('Ext.data.Store', {
            pageSize: 50,
            proxy: {
                type: 'memory'
            },
            fields: [
                {name: 'studyName', type: 'string'},
                {name: 'studyId', type: 'string'}
            ],
            autoLoad: false
        });

        var studyFilter = new StudyFilterFormPanel({
            title: false,
            collapsible: false,
            studiesStore: this.studiesStore,
            height: 500,
            border: false,
            studyFilterTpl: '<tpl><div class="ocb-study-filter"><a href="?eva-study={studyId}" target="_blank">{studyName}</a> (<a href="http://www.ebi.ac.uk/ena/data/view/{studyId}" target="_blank">{studyId}</a>) </div></tpl>'
        });

        speciesFilter.on('species:change', function (e) {
            if (e.species) {
                _this._loadListStudies(studyFilter, e.species);
                console.log(e.species)

                //EvaManager.get({
                //    category: 'meta/studies',
                //    resource: 'list',
                //    params: {species: e.species},
                //    success: function (response) {
                //        try {
                //            projects = response.response[0].result;
                //        } catch (e) {
                //            console.log(e);
                //        }
                //    }
                //});
            }

        });

        this.on('studies:change', function (e) {
//            studyFilter.setStudies(e.studies);
        });
        this._loadListStudies(studyFilter);
        var conseqType = new ConsequenceTypeFilterFormPanel({
            consequenceTypes: consequenceTypes,
            collapsed: false,
            fields: [
                {name: 'name', type: 'string'}
            ],
            columns: [
                {
                    xtype: 'treecolumn',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'name'
                }
            ]
        });
        var trackNameField = Ext.create('Ext.form.field.Text', {
            xtype: 'textfield',
            emptyText: 'Track name',
            flex: 5
        });
        var formPanel = new EvaFormPanel({
            title: '<span style="cursor:pointer">&nbsp;Add tracks </span>',
            border: false,
            headerConfig: {
                baseCls: 'eva-header-1',
                titlePosition:1
            },
            submitButtonText: 'Add',
            collapsible: true,
            titleCollapse: true,
            target: target,
            filters: [speciesFilter, studyFilter],
//            width: 300,
//            height:600,
            mode: 'vbox',
            barItems: [
                trackNameField
            ],
            handlers: {
                'submit': function (e) {
                    var title = trackNameField.getValue();
                    if (e.values.studies == null) {
                        e.values.studies = [];
                    }
                    if (title !== '') {
                        _this._addGenomeBrowserTrack(title, e.values);
                        trackNameField.setValue('');
                    }
                }
            }
        });

        //formPanel.panel.collapse();

        return formPanel;
    },
    _addGenomeBrowserTrack: function (title, params) {
        params.exclude = 'sourceEntries';
        var eva = new FeatureTrack({
            title: title,
            closable:true,
            featureType: 'eva',
            minHistogramRegionSize: 10000,
            maxLabelRegionSize: 3000,
            height: 100,
            renderer: new FeatureRenderer({
                label: function (f) {
                    var title = f.id;
                    if (title == '') {
                        title = f.chromosome + ":" + f.start + "-" + f.end;
                    }
                    return title;
                },
                tooltipTitle: function (f) {
                    var title = f.id;
                    if (title == '') {
                        title = f.chromosome + ":" + f.start + "-" + f.end;
                    }
                    return f.type + ' - <span style="color:#399697">' + title + '</span>';
                },
                tooltipText: function (f) {
                    var str = [
                        'Location: ' + '<span style="color:#156765">' + f.chromosome + ":" + f.start + "-" + f.end + '</span>',
                        'Alt. allele: ' + '<span style="color:#156765">' + f.allele + '</span>',
                        'Variant class: ' + '<span style="color:#156765">' + f.type + '</span>'
                    ];
                    var hgvs = [];
                    for (var key in f.hgvs) {
                        hgvs.push('<span style="margin-left: 10px">' + Utils.camelCase(key) + '</span>' + ': <span style="color:#156765">' + f.hgvs[key] + '</span>');
                    }
                    if (hgvs.length > 0) {
                        str.push('HGVS' + '<br><span>' + hgvs.join('<br>') + '</span>');
                    }
                    var files = [];
                    for (var key in f.files) {
                        files.push('<span style="margin-left: 10px">' + f.files[key].fileId + '</span>' + ' (<span style="color:#156765">' + f.files[key].studyId + '</span>)');
                    }
                    if (files.length > 0) {
                        str.push('Files (study)' + '<br><span>' + files.join('<br>') + '</span>');
                    }
                    return str.join('<br>');
                },
                color: function (f) {
                    return "#399697";
                },
                infoWidgetId: "id",
                height: 10,
                histogramColor: "#399697",
                handlers: {
                    'feature:mouseover': function (e) {
                        // e.feature
                        console.log(e);
                    }
                }
            }),
            dataAdapter: new EvaAdapter({
                host: METADATA_HOST,
                version: 'v1',
                category: "segments",
                resource: "variants",
                params: params,
                cacheConfig: {
                    chunkSize: 10000
                }
            })
        });
        this.genomeViewer.addTrack(eva);
        this.formPanel.panel.collapse();
    },
    _createGenomeViewer: function (target) {
        var _this = this;

        if (this.position) {
            var position = this._getRegion(this.position);
            var region = new Region(position);
        } else {
            var region = new Region({
                chromosome: "13",
                start: 32889611,
                end: 32889611
            });
        }

        var genomeViewer = new GenomeViewer({
//            cellBaseHost:CELLBASE_HOST,
            sidePanel: false,
            target: target,
            border: false,
            resizable: true,
            width: 1320,
            region: region,
            availableSpecies: AVAILABLE_SPECIES,
            // trackListTitle: '',
            drawNavigationBar: true,
            drawKaryotypePanel: false,
            drawChromosomePanel: false,
            drawRegionOverviewPanel: true,
            overviewZoomMultiplier: 50,
            navigationBarConfig: {
                componentsConfig: {
                    leftSideButton: false,
                    restoreDefaultRegionButton: false,
                    regionHistoryButton: false,
                    speciesButton: false,
                    chromosomesButton: false,
                    karyotypeButtonLabel: false,
                    chromosomeButtonLabel: false,
                    //regionButton: false,
                    // zoomControl: false,
                    windowSizeControl: false,
                    // positionControl: false,
                    moveControl: false,
                    autoheightButton: false,
                    // compactButton: false,
                    // searchControl: false

                }
            }
        }); //the div must exist
        genomeViewer.navigationBar.on('leftSideButton:click', function () {
            $(_this.formPanelGenomeFilterDiv).toggle();
        });
        var renderer = new FeatureRenderer(FEATURE_TYPES.gene);
        renderer.on({
            'feature:click': function (event) {
                // feature click event example
                console.log(event)
            }
        });


        var geneOverview = new FeatureTrack({
            // title: 'Gene overview',
            minHistogramRegionSize: 20000000,
            maxLabelRegionSize: 10000000,
            height: 100,
            renderer: renderer,
            dataAdapter: new CellBaseAdapter({
                category: "genomic",
                subCategory: "region",
                resource: "gene",
                params: {
                    exclude: 'transcripts,chunkIds'
                },
                species: genomeViewer.species,
                cacheConfig: {
                    chunkSize: 100000
                }
            })
        });
        var sequence = new SequenceTrack({
            // title: 'Sequence',
            height: 100,
            visibleRegionSize: 200,
            renderer: new SequenceRenderer(),
            dataAdapter: new SequenceAdapter({
                category: "genomic",
                subCategory: "region",
                resource: "sequence",
                species: genomeViewer.species
            })
        });
        var gene = new GeneTrack({
            title: 'Gene',
            minHistogramRegionSize: 20000000,
            maxLabelRegionSize: 10000000,
            minTranscriptRegionSize: 200000,
            height: 140,
            renderer: new GeneRenderer(),
            dataAdapter: new CellBaseAdapter({
                category: "genomic",
                subCategory: "region",
                resource: "gene",
                species: genomeViewer.species,
                params: {
                    exclude: 'transcripts.tfbs,transcripts.xrefs,transcripts.exons.sequence'
                },
                cacheConfig: {
                    chunkSize: 100000
                }
            })
        });
        var snp = new FeatureTrack({
            title: 'SNP',
            featureType: 'SNP',
            minHistogramRegionSize: 10000,
            maxLabelRegionSize: 3000,
            height: 100,
            renderer: new FeatureRenderer(FEATURE_TYPES.snp),
            dataAdapter: new CellBaseAdapter({
                category: "genomic",
                subCategory: "region",
                resource: "snp",
                params: {
                    exclude: 'transcriptVariations,xrefs,samples'
                },
                species: genomeViewer.species,
                cacheConfig: {
                    chunkSize: 10000
                }
            })
        });
        genomeViewer.addOverviewTrack(geneOverview);
        genomeViewer.addTrack([sequence, gene, snp]);
        return genomeViewer;
    },
    _loadListStudies: function (filter, species) {
        var _this = this;
        var studies = [];
        var resource = '';
        if (species == null) {
            resource = 'all'
        } else {
            resource = 'list'
        }
        EvaManager.get({
            category: 'meta/studies',
            resource: resource,
            params: {species: species},
            success: function (response) {
                try {
                    studies = response.response[0].result;
                    if (studies.length > 0) {
                        studies[0]['uiactive'] = true;
                    }
                } catch (e) {
                    console.log(e);
                }
                filter.studiesStore.loadRawData(studies);
                _this.trigger('studies:change', {studies: studies, sender: _this});
            },
            error: function () {
                filter.studiesStore.loadRawData([]);
            }
        });
    },
    _getRegion: function (value) {
        var _this = this;
        var temp = value.split(":");
        var region = {chromosome: temp[0]};
        var temp_position = temp[1].split("-");
        _.extend(region, {start: temp_position[0], end: temp_position[1]});

        return region;
    }


};