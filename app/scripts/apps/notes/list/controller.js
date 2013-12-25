/*global define*/
define([
    'underscore',
    'app',
    'marionette',
    'collections/notes',
    'apps/notes/list/views/noteSidebar'
], function (_, App, Marionette, Notes, NotesView) {
    'use strict';

    var List = App.module('AppNote.List');

    /**
     * Notes list controller - shows notes list in sidebar
     */
    List.Controller = Marionette.Controller.extend({
        initialize: function () {
            _.bindAll(this, 'listNotes', 'showSidebar', 'favoriteNotes');

            this.notes = new Notes();

            // Application events
            App.on('notes:show', this.changeFocus, this);

            // Filter
            this.listenTo(this.notes, 'filter:all', this.activeNotes, this);
            this.listenTo(this.notes, 'filter:favorite', this.favoriteNotes, this);
            this.listenTo(this.notes, 'filter:trashed', this.trashedNotes, this);
            this.listenTo(this.notes, 'filter:search', this.searchNotes, this);

            // Navigation with keys
            this.listenTo(this.notes, 'navigateTop', this.toPrevNote, this);
            this.listenTo(this.notes, 'navigateBottom', this.toNextNote, this);
        },

        /**
         * Fetch notes, then show it
         */
        listNotes: function (args) {
            this.args = args;
            App.settings.pagination = parseInt(App.settings.pagination);

            // Offset
            if (_.isNull(this.args.page)) {
                this.args.page = 0;
            } else {
                this.args.page = parseInt(this.args.page);
            }

            // Filter
            if (_.isNull(this.args) === false && this.args.filter) {
                this.notes.trigger('filter:' + this.args.filter);
            } else {
                this.notes.trigger('filter:all');
            }
        },

        /**
         * Show only active notes
         */
        activeNotes: function () {
            $.when(
                this.notes.fetch({
                    offset : this.args.page,
                    limit  : App.settings.pagination,
                    conditions: {trash : 0}
                })
            ).done(this.showSidebar);
        },

        /**
         * Show favorite notes
         * @TODO At the time limit and offset do not work properly
         */
        favoriteNotes: function () {
            $.when(
                this.notes.fetch({
                    //offset : this.args.page,
                    //limit  : App.settings.pagination,
                    conditions: {isFavorite : 1}
                })
            ).done(this.showSidebar);
        },

        /**
         * Show only removed notes
         */
        trashedNotes: function () {
            $.when(
                this.notes.fetch({
                    conditions: {trash : 1}
                })
            ).done(this.showSidebar);
        },

        /**
         * Search notes
         */
        searchNotes: function () {
            var self = this;
            $.when(
                // Fetch without limit, because with encryption, searching is impossible
                this.notes.fetch({
                    conditions: {trash : 0}
                })
            ).done(
                function () {
                    var notes = self.notes.search(self.args.query);
                    self.notes.reset(notes);
                    self.showSidebar();
                }
            );
        },

        /**
         * Show content
         */
        showSidebar: function () {
            // Pagination
            if (this.notes.length > App.settings.pagination) {
                var notes = this.notes.pagination(this.args.page, App.settings.pagination);
                this.notes.reset(notes);
            }

            // Next page
            if (this.notes.length === App.settings.pagination) {
                this.args.next = this.args.page + App.settings.pagination;
            } else {
                this.args.next = this.args.page;
            }

            // Previous page
            if (this.args.page > App.settings.pagination) {
                this.args.prev = this.args.page - App.settings.pagination;
            }

            var View = new NotesView({
                collection : this.notes,
                args       : this.args
            });

            App.sidebar.show(View);

            // Active note
            if (this.args.id !== undefined) {
                this.changeFocus(this.args);
            }
        },

        changeFocus: function (args) {
            if ( !args ) { return; }
            this.args = args;
            this.notes.trigger('changeFocus', args.id);
        },

        /**
         * Redirects to note
         */
        toNote: function (note) {
            if ( !note) { return; }
            var url = '/notes';

            if (this.args.filter) {
                url += '/f/' + this.args.filter;
            }
            if (this.args.filter === 'search') {
                url += '/q/' + this.args.query;
            }
            if (this.args.page) {
                url += '/p' + this.args.page;
            }

            if (_.isObject(note)) {
                url += '/show/' + note.get('id');
            }

            return App.navigate(url, true);
        },

        /**
         * Navigate to next note
         */
        toNextNote: function () {
            // Nothing is here
            if (this.notes.length === 0) {
                return;
            }

            var note;
            if ( !this.args.id) {
                note = this.notes.at(0);
            } else {
                note = this.notes.get(this.args.id);
                note = note.next();
            }

            if (this.notes.length >= App.settings.pagination && this.notes.indexOf(note) < 0) {
                this.notes.trigger('nextPage');
            }

            return this.toNote(note);
        },

        /**
         * Navigate to previous note
         */
        toPrevNote: function () {
            // Nothing is here
            if (this.notes.length === 0) {
                return;
            }

            var note;
            if ( !this.args.id) {
                note = this.notes.last();
            } else {
                note = this.notes.get(this.args.id);
                note = note.prev();
            }

            if (this.args.page > 1 && this.notes.indexOf(note) < 0) {
                this.notes.trigger('prevPage');
            }

            return this.toNote(note);
        }

    });

    return List.Controller;
});
