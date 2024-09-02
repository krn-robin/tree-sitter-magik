package tree_sitter_magik_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_magik "github.com/krn-robin/tree-sitter-magik/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_magik.Language())
	if language == nil {
		t.Errorf("Error loading Magik grammar")
	}
}
