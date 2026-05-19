const renderTemplate = (html, data) => {
    return html.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : "";
    });
};

module.exports = renderTemplate;