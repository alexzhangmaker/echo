/**
 * storageGDrv.js
 * A library to handle Note reading and writing to Google Drive.
 * Requires GAPI client to be initialized with Drive API scopes.
 */

export class GoogleDriveStorage {
    constructor() {
        this.gapi = window.gapi;
    }

    /**
     * Check if GAPI and Drive client are ready
     */
    _ensureClient() {
        if (!this.gapi || !this.gapi.client || !this.gapi.client.drive) {
            throw new Error('GAPI Drive client not initialized. Call gapi.client.init first.');
        }
    }

    /**
     * Map GAPI file metadata to Note metadata
     * Metadata is minimalist here as it's primarily managed externally (e.g. Firebase)
     * @param {Object} gapiFile - File object from GAPI
     * @returns {Object} Note metadata
     */
    _mapFileToNoteMetadata(gapiFile) {
        return {
            name: gapiFile.name,
            uri: `gdrive://${gapiFile.id}`,
            fileId: gapiFile.id,
            createdAt: gapiFile.createdTime,
            lastUpdate: gapiFile.modifiedTime,
            mimeType: gapiFile.mimeType
        };
    }

    /**
     * List files in a specific folder
     * @param {string} folderId - Google Drive Folder ID
     * @returns {Promise<Array>} List of note basic metadata
     */
    async listNotes(folderId = 'root') {
        this._ensureClient();
        const response = await this.gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
            fields: 'files(id, name, mimeType, createdTime, modifiedTime)',
            pageSize: 100
        });

        return response.result.files.map(file => this._mapFileToNoteMetadata(file));
    }

    /**
     * Read note content
     * @param {Object} metadata - Note metadata object containing uri or fileId
     * @returns {Promise<string>} Clean Markdown content
     */
    async readNote(metadata) {
        this._ensureClient();
        const fileId = metadata.fileId || metadata.uri?.replace('gdrive://', '');
        if (!fileId) throw new Error('Missing fileId or URI in metadata');

        const response = await this.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        return response.body;
    }

    /**
     * Write/Update note content and basic Drive metadata (filename)
     * @param {Object} metadata - Note metadata (name is required for creation/renaming)
     * @param {string} content - The clean Markdown content string
     * @param {string} folderId - Optional folder ID for new files
     * @returns {Promise<Object>} Updated basic metadata
     */
    async writeNote(metadata, content, folderId = 'root') {
        this._ensureClient();

        const fileId = metadata.fileId || metadata.uri?.replace('gdrive://', '');

        if (fileId) {
            // Update existing file: Filename and Content are updated separately in GAPI
            // 1. Update filename if it has changed
            await this.gapi.client.drive.files.update({
                fileId: fileId,
                resource: {
                    name: metadata.name
                }
            });

            // 2. Update content (media) - The body remains clean Markdown
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.gapi.auth.getToken().access_token}`,
                    'Content-Type': 'text/markdown'
                },
                body: content
            });

            const updated = await this.gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id, name, mimeType, createdTime, modifiedTime'
            });
            return this._mapFileToNoteMetadata(updated.result);

        } else {
            // Create new file
            const response = await this.gapi.client.drive.files.create({
                resource: {
                    name: metadata.name,
                    parents: [folderId],
                    mimeType: 'text/markdown'
                },
                fields: 'id'
            });

            const newId = response.result.id;

            // Upload content
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${newId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.gapi.auth.getToken().access_token}`,
                    'Content-Type': 'text/markdown'
                },
                body: content
            });

            const created = await this.gapi.client.drive.files.get({
                fileId: newId,
                fields: 'id, name, mimeType, createdTime, modifiedTime'
            });
            return this._mapFileToNoteMetadata(created.result);
        }
    }

    /**
     * Delete a note
     * @param {Object} metadata - Note metadata
     */
    async deleteNote(metadata) {
        this._ensureClient();
        const fileId = metadata.fileId || metadata.uri.replace('gdrive://', '');
        await this.gapi.client.drive.files.delete({
            fileId: fileId
        });
    }
}
