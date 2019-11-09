import Awesomplete from "awesomplete";
import SparqlEndpoint from "@retog/sparql-client";

export default class Prefixplete {
    constructor(input, sparqlEndpoint = new SparqlEndpoint("https://mtp.linked.solutions/sparql")) {
        this._sparqlEndpoint = sparqlEndpoint;
        this._input = input;

        const self = this;

        let previousValue = input.value;
        let prefixUrls = [];
        let cs = [];
        let ss = [];

        const awesomplete = new Awesomplete(input);
        //awesomplete.maxItems = 15;
        //awesomplete.sort = false;

        input.addEventListener("keyup", (e) => {
            if ((input.value.length >= 2) && (e.key !== "Enter") && (input.value !== previousValue)) {
                populateSuggestions();
            }
            return true;
        });

        input.addEventListener("awesomplete-selectcomplete", (e) => {
            if (input.value.trim().split(":").length < 2) {
                populateSuggestions();
                awesomplete.open();
            } else {
                this.lookup();
            }
        });

        function populateSuggestions() {
            if (input.value.toString().indexOf(":") === -1) {
                previousValue = input.value;
                Promise.all([getPrefixUrlSuggestions(input.value), getCombinedSuggestions(input.value)]).then(v => {
                    awesomplete.list = prefixUrls.map(i => i.prefix + ":").concat(cs);
                });
            } else {
                previousValue = input.value;
                let speciesIn = input.value.toString().substr(input.value.toString().indexOf(" ") + 1);
                let genusIn = input.value.toString().substring(0, input.value.toString().indexOf(" "));
                if (speciesIn.length > 0) {
                    getSpeciesSuggestions(speciesIn, genusIn).then(values => {
                        awesomplete.list = ss.map(i => genusIn + ":" + i);
                    });
                } else {
                    getSpeciesSuggestions("", genusIn).then(values => {
                        awesomplete.list = ss.map(i => genusIn + ":" + i);
                    });
                }
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


        /**
         * 
         * @param {type} prefix
         * @returns A promise for an array of matching genera
         */
        function getPrefixUrlSuggestions(prefix) {
            let query = "PREFIX vann: <http://purl.org/vocab/vann/>\n" +
            "SELECT ?prefix ?uri WHERE {\n" +
            "    ?sub vann:preferredNamespacePrefix ?prefix ;\n" +
            "         vann:preferredNamespaceUri ?uri .\n" +
            "  FILTER ( REGEX (?prefix, \""+ prefix +"\") )\n" +
            "}";
            console.log("%cprefixplete.js:98", "color: #4527a0", "Sparql-Endpoint", self._sparqlEndpoint);
            return self._sparqlEndpoint.getSparqlResultSet(query).then(json => {
                prefixUrls = json.results.bindings.map(binding => {
                    return {
                        prefix: binding.prefix.value,
                        uri: binding.uri.value,
                    };
                });
                return true;
            });
        }

        function getSpeciesSuggestions(prefix, genus) {
            let query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "PREFIX dwc: <http://rs.tdwg.org/dwc/terms/>\n" +
                "PREFIX dwcfp: <http://filteredpush.org/ontologies/oa/dwcFP#>\n" +
                "SELECT DISTINCT ?species WHERE {\n" +
                " GRAPH <https://linked.opendata.swiss/graph/plazi> {\n" +
                "?sub dwc:genus \"" + genus + "\" .\n" +
                "?sub dwc:species ?species .\n" +
                "?sub rdf:type dwcfp:TaxonName.\n" +
                "FILTER REGEX(?species, \"^" + prefix + "\",\"i\")\n" +
                " }\n" +
                "} ORDER BY UCASE(?species) LIMIT 10";
            return self._sparqlEndpoint.getSparqlResultSet(query).then(json => {
                ss = json.results.bindings.map(binding => binding.species.value);
                return true;
            });
        }

        function getCombinedSuggestions(prefix) {
            let query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "PREFIX dwc: <http://rs.tdwg.org/dwc/terms/>\n" +
                "PREFIX dwcfp: <http://filteredpush.org/ontologies/oa/dwcFP#>\n" +
                "SELECT DISTINCT ?genus ?species WHERE {\n" +
                " GRAPH <https://linked.opendata.swiss/graph/plazi> {\n" +
                "?sub dwc:genus ?genus .\n" +
                "?sub dwc:species ?species .\n" +
                "?sub rdf:type dwcfp:TaxonName.\n" +
                "FILTER REGEX(?species, \"^" + prefix + "\",\"i\")\n" +
                " }\n" +
                "} ORDER BY UCASE(?species) LIMIT 10";
            return self._sparqlEndpoint.getSparqlResultSet(query).then(json => {
                cs = json.results.bindings.map(binding => binding.genus.value + ":" + binding.species.value);
                return true;
            });
        }
    }

    lookup() {
        this.action(this._input.value.toString());
    }

    action(value) {
        console.log("%cprefixplete.js:149", "color: #4527a0", "Value "+value+" selected, overwrite Prefixplete.action(value) method to have something happen.")
    }
}