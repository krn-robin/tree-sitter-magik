from unittest import TestCase

import tree_sitter, tree_sitter_magik


class TestLanguage(TestCase):
    def test_can_load_grammar(self):
        try:
            tree_sitter.Language(tree_sitter_magik.language())
        except Exception:
            self.fail("Error loading Magik grammar")
