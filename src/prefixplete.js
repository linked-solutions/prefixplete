import Awesomplete from "awesomplete";
import { newEngine } from "@comunica/actor-init-sparql";

const sparqlEngine = newEngine();

export default class Prefixplete {
    constructor(input, 
        sparqlEndpoint = "https://mtp.linked.solutions/sparql",
        prefixGraphPrefix = "https://mtp.linked.solutions/") {
 
        this._sparqlEndpoint = sparqlEndpoint;
        this._input = input;
        this._prefixMappings = [];

        const self = this;

        let previousValue = input.value;
        let prefixSuggestions = [];
        let fullSuggestions = [];

        const awesomplete = new Awesomplete(input);
        awesomplete.maxItems = 15;
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

        function getFullUri(prefixedUri) {
            const splitup = prefixedUri.split(":");
            //console.log("%cPrefixplete > getFullUri", "color: #4527a0", splitup, prefixMappings);
            const mapping = self._prefixMappings.find(m => splitup[0] === m.prefix);
            if (mapping) {
                return mapping.uri + splitup[1];
            } else {
                return prefixedUri;
            }
        }

        function getPrefixedUri(fullUri) {
            const uri = self._getPrefixedUri(fullUri);
            return uri != null ? uri : fullUri;
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
                getFullSuggestions({ prefix: splitup[0], url: getFullUri(input.value.toString()) }).then(_ => {
                    awesomplete.list = fullSuggestions.map(i => i.display !== i.prefix + ":" ? i.display : undefined);
                    //console.log("%cPrefixplete > populateSuggestions", "color: #4527a0", fullSuggestions.map(i => i.display !== i.prefix + ":" ? i.display : undefined));
                    awesomplete.open();
                });
            }
        }

        function streamToArray(stream) {
            const chunks = [];
            return new Promise((resolve, reject) => {
              stream.on("data", chunk => chunks.push(chunk));
              stream.on("error", reject);
              stream.on("end", () => resolve(chunks));
            });
          }

        function getPrefixUrlSuggestions(prefix) {
            let query = "PREFIX vann: <http://purl.org/vocab/vann/>\n" +
                "SELECT ?prefix ?uri WHERE {\n" +
                "    ?sub vann:preferredNamespacePrefix ?prefix ;\n" +
                "         vann:preferredNamespaceUri ?uri .\n" +
                "    FILTER ( REGEX (?prefix, \"" + prefix + "\") )\n" +
                "}\n" +
                "LIMIT 40";
            return sparqlEngine.query(query, { sources: [
                { type: 'sparql', value: self._sparqlEndpoint}
                ]}).then(json => {
                    return streamToArray(json.bindingsStream);
                }).then(bindings => bindings.map(binding => {
                    return {
                        prefix: binding.get("?prefix").value,
                        display: binding.get("?prefix").value + ":",
                        uri: binding.get("?uri").value,
                    };
                })).then(suggestions => {
                    self._prefixMappings = self._prefixMappings.concat(suggestions);
                    prefixSuggestions = suggestions
                    return suggestions;
                });
        }

        function getFullSuggestions(prefix) {
            //console.log("%cPrefixplete > getFullSuggestions", "color: #4527a0", prefix);
            let query = "SELECT DISTINCT ?uri WHERE {\n" +
                "  GRAPH <"+prefixGraphPrefix + prefix.prefix + "> {\n" +
                "    ?uri ?p ?o .\n" +
                "    FILTER ( REGEX ( STR(?uri), \"" + prefix.url.replace(/\./g, "\\\\.") + "\") )\n" +
                "  }\n" +
                "}\n" +
                "LIMIT 40";
                return sparqlEngine.query(query, { sources: [
                    { type: 'sparql', value: self._sparqlEndpoint}
                    ]}).then(json => {
                        return streamToArray(json.bindingsStream);
                    }).then(bindings => bindings.map(binding => {
                        return {
                            prefix: prefix.prefix,
                            display: getPrefixedUri(binding.get("?uri").value),
                            uri: binding.get("?uri").value,
                        };
                    })).then(suggestions => {
                        fullSuggestions = suggestions
                        return suggestions;
                    });
        }
    }

    _getPrefixedUri(fullUri) {
        const mapping = this._prefixMappings.find(m => fullUri.startsWith(m.uri));
        if (mapping) {
            return fullUri.replace(mapping.uri, mapping.prefix + ":")
        } else {
            return null;
        }
    }

    setValue(value) {
        const prefixedUri = this._getPrefixedUri(value);
        if (prefixedUri) {
            this._input.value = prefixedUri;
        } else {
            this._input.value = value;
            let query = "PREFIX vann: <http://purl.org/vocab/vann/>\n" +
                    "SELECT DISTINCT ?prefix ?uri WHERE {\n" +
                    "    ?sub vann:preferredNamespacePrefix ?prefix ;\n" +
                    "         vann:preferredNamespaceUri ?uri .\n" +
                    "    FILTER ( REGEX (\"" + value + "\", \"^\" + str(?uri)) )\n" +
                    "}\n" +
                    "LIMIT 1";
            return this._sparqlEndpoint.getSparqlResultSet(query).then(json => {
                    if (json.results.bindings[0]) {
                        this._input.value = value.replace(
                            json.results.bindings[0].uri.value,
                            json.results.bindings[0].prefix.value + ":");
                        this._prefixMappings.push({
                            'prefix': json.results.bindings[0].prefix.value,
                            'uri': json.results.bindings[0].uri.value
                        });
                    }
                    return true;
                });
        }
    }

    get value() {
        const splitup = this._input.value.toString().split(":");
        const mapping = this._prefixMappings.find(m => splitup[0] === m.prefix);
        if (mapping && this._input.value.toString().indexOf(":") !== -1) {
            return mapping.uri + splitup[1];
        } else {
            return this._input.value.toString();
        }
    }

    set value(value) {
        this.setValue(value);
    }

    lookup() {
        this.action(this.value);
    }

    action(value) {
        console.log("%cPrefixplete.action(value)", "color: #4527a0", "Value " + value + " selected, overwrite Prefixplete.action(value) method to have something happen.")
    }
}