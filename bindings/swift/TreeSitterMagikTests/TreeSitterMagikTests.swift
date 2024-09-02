import XCTest
import SwiftTreeSitter
import TreeSitterMagik

final class TreeSitterMagikTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_magik())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Magik grammar")
    }
}
