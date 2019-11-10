import Awesomplete from "awesomplete";
import SparqlEndpoint from "@retog/sparql-client";

export default class Prefixplete {
    constructor(input, sparqlEndpoint = new SparqlEndpoint("https://mtp.linked.solutions/sparql")) {
        this._sparqlEndpoint = sparqlEndpoint;
        this._input = input;

        const self = this;

        let previousValue = input.value;
        let prefixMappings = []; // [{uri, prefix},..]
        let prefixSuggestions = [];
        let fullSuggestions = [];

        const awesomplete = new Awesomplete(input);
        awesomplete.maxItems = 25;
        awesomplete.

        input.addEventListener("keyup", (e) => {
            if ((input.value.length >= 2) && (e.key !== "Enter") && (input.value !== previousValue)) {
                populateSuggestions();
            }
            return true;
        });

        input.addEventListener("awesomplete-selectcomplete", (e) => {
            if (input.value.trim().split(":").length < 2 || input.value.trim().split(":")[1] === "") {
                populateSuggestions();
                awesomplete.open();
            } else {
                this.lookup();
            }
        });

        function getFullUri (prefixedUri) {
            const splitup = prefixedUri.split(":");
            //console.log("%cPrefixplete > getFullUri", "color: #4527a0", splitup, prefixMappings);
            const mapping = prefixMappings.find(m => splitup[0] === m.prefix);
            if (mapping) {
                return mapping.uri + splitup[1];
            } else {
                return prefixedUri;
            }
        }

        function populateSuggestions() {
            if (input.value.toString().indexOf(":") === -1) {
                previousValue = input.value;
                getPrefixUrlSuggestions(input.value).then(_ => {
                    awesomplete.list = prefixSuggestions.map(i => i.display);
                    awesomplete.open();
                });
            } else {
                previousValue = input.value;
                const splitup = input.value.toString().split(":");
                getFullSuggestions({prefix: splitup[0], url: getFullUri(input.value.toString())}).then(_ => {
                    awesomplete.list = fullSuggestions.map(i => i.display !== i.prefix + ":" ? i.display : undefined);
                    awesomplete.open();
                });
            }
        } 

        /*awesomplete.filter = (t, i) => {
            let foundPos = t.toLowerCase().indexOf(i.toLowerCase());
            return (foundPos === 0) || (foundPos === (t.indexOf(".") + 1));
        };*/

        /*awesomplete.item = (suggestion, i) => {
            let foundPos = suggestion.toLowerCase().indexOf(i.toLowerCase());
            let suggestionSpacePos = suggestion.substr(0, suggestion.length - 1).indexOf(" ");
            let html;
            if (suggestionSpacePos === -1) {
                html = "<mark>" + suggestion.substring(0, i.length) + "</mark>" + suggestion.substring(i.length);
            } else if (i.indexOf(" ") === -1) {
                html = suggestion.substring(0, suggestionSpacePos + 1) + "<mark>" +
                    suggestion.substring(suggestionSpacePos + 1, suggestionSpacePos + 1 + i.length) +
                    "</mark>" + suggestion.substring(suggestionSpacePos + 1 + i.length);
            } else if (i.indexOf(" ") !== -1) {
                html = "<mark>" +
                    suggestion.substring(0, i.length) +
                    "</mark>" + suggestion.substring(i.length);
            }
            let result = document.createElement("li");
            result.setAttribute("aria-selected", "false");
            result.innerHTML = html;
            return result;
        };*/

        function getPrefixUrlSuggestions(prefix) {
            let query = "PREFIX vann: <http://purl.org/vocab/vann/>\n" +
            "SELECT ?prefix ?uri WHERE {\n" +
            "    ?sub vann:preferredNamespacePrefix ?prefix ;\n" +
            "         vann:preferredNamespaceUri ?uri .\n" +
            "  FILTER ( REGEX (?prefix, \""+ prefix +"\") )\n" +
            "}\n" +
            "LIMIT 40";
            return self._sparqlEndpoint.getSparqlResultSet(query).then(json => {
                prefixSuggestions = json.results.bindings.map(binding => {
                    return {
                        prefix: binding.prefix.value,
                        display: binding.prefix.value,
                        uri: binding.uri.value,
                    };
                });
                prefixMappings = prefixMappings.concat(prefixSuggestions);
                return true;
            });
        }

        function getFullSuggestions(prefix) {
            //console.log("%cPrefixplete > getFullSuggestions", "color: #4527a0", prefix);
            let query = "PREFIX vann: <http://purl.org/vocab/vann/>\n" +
            "SELECT DISTINCT ?uri WHERE {\n" +
            "    ?uri ?p ?o .\n" +
            "    FILTER ( REGEX ( STR(?uri), \""+ prefix.url.replace(/\./, "\\\\.") +"\") )\n" +
            "}\n" +
            "LIMIT 40";
            return self._sparqlEndpoint.getSparqlResultSet(query).then(json => {
                fullSuggestions = json.results.bindings.map(binding => {
                    return {
                        prefix: prefix.prefix,
                        display: binding.uri.value.replace(prefix.url, prefix.prefix + ":"),
                        uri: binding.uri.value,
                    };
                });
                return true;
            });
        }
    }

    lookup() {
        this.action(this._input.value.toString());
    }

    action(value) {
        console.log("%cPrefixplete.action(value)", "color: #4527a0", "Value "+value+" selected, overwrite Prefixplete.action(value) method to have something happen.")
    }
}