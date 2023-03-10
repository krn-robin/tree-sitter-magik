module.exports = grammar({
    name: "magik",

    rules: {
	source_file: $ => repeat($.fragment),

	fragment: $ =>
	prec.left(repeat1(seq($._statement, optional(seq("\n$\n"))))),

	method_declaration: $ =>
	prec.left(
	    seq(
		optional($.pragma),
		"_method",
		field("exemplarname", $.identifier),
		".",
		field("name", $.identifier),
		optional($.parameter_list),
		optional($.documentation),
		repeat($._statement),
		"_endmethod"
	    )
	),

	parameter_list: $ =>
	prec.left(
	    choice(
		seq("(", optional(seq(commaSep1($.parameter), optional(","))), ")"),
		seq("<<", seq(commaSep1($.parameter), optional(",")))
	    )
	),

	parameter: $ => $.identifier,

	block: $ =>
	prec.left(
	    seq("_block", repeat($._statement), "_endblock")
	),

	if_expression: $ =>
	seq(
	    "_if",
	    field("condition", $._expression),
	    "_then",
	    repeat($._statement),
	    repeat(seq("_elif", field("condition", $._expression), "_then", repeat($._statement))),
	    optional(seq("_else", repeat($._statement))),
	    "_endif"
	),

	loop_expression: $ =>
	    seq(
		"_loop",
	    repeat($._statement),
		"_endloop"
	    ),

	iterator_expression: $ =>
	    seq(
		optional(seq("_for", $.identifier)),
		"_over", $._expression,
		$.loop_expression
	    ),

	try_expression: $ =>
	seq(
	    "_try",
	    optional(seq("_with", field("condition", $.identifier))),
	    repeat($._statement),
	    "_when",
	    field("raised_condition", $.identifier), repeat(seq(",", field("raised_condition", $.identifier))),
	    repeat($._statement),
	    "_endtry"
	),

	pragma: $ => seq("_pragma(", /.*/, ")"),

	_literal: $ =>
	choice(
	    $.true,
	    $.false,
	    $.maybe,
	    $.character_literal,
	    $.string_literal,
	    $.number,
	    $.unset,
	    $.super,
	    $.self,
	    $.symbol
	),

	string_literal: $ =>
	token(
	    choice(
		seq('"', repeat(choice(/[^\\"\n]/, /\\(.|\n)/)), '"'),
		seq("'", repeat(choice(/[^\\"\n]/, /\\(.|\n)/)), "'")
	    )
	),

	call: $ =>
	prec.left(
	    seq(
		field("receiver", choice($.call, $._literal, $.identifier)),
		field("operator", "."),
		field("message", $.identifier),
		optional($.parameter_list)
	    )
	),

	true: $ => "_true",
	false: $ => "_false",
	maybe: $ => "_maybe",
	unset: $ => "_unset",
	super: $ => "_super",
	self: $ => "_self",

	_statement: $ =>
	choice(
	    $.method_declaration,
	    $.block,
	    $.comment,
	    $.return_statement,
	    $._expression
	    // TODO: other kinds of statements
	),

	return_statement: $ =>
	prec.left(
	    choice(
		seq("_return", optional($._expression)),
		seq(">>", $._expression)
	    )
	),

	_expression: $ =>
	    choice(
		$.call,
		$.iterator_expression,
		$.if_expression,
		$.loop_expression,
		$.try_expression,
		$.logical_operator,
		$.relational_operator,
		$._literal,
		$.identifier
		// TODO: other kinds of expressions
	    ),

	identifier: $ => /[a-z][a-z0-9_\?]*/,

	number: $ => /\d+/,

	relational_operator: $ =>
	prec.right(
	    seq(
		field("left", $._expression),
		field("operator", choice("_is", "_isnt", "=", "~=", "<>", ">=", "<=")),
		field("right", $._expression)
	    )
	),

	logical_operator: $ =>
	prec.left(
	    seq(
		field("left", $._expression),
		field("operator", choice("_and", "_or", "_xor", "_andif", "_orif", "_xorif")),
		field("right", $._expression)
	    )
	),

	symbol: $ => seq(':', $.identifier),
	character_literal: $ => seq('%', choice($.identifier, /./)),

	documentation: $ => repeat1(/##.*/),
	comment: $ => prec.right(repeat1(/#.*/)),
    },
});

function commaSep1(rule) {
    return sep1(rule, ",");
}

function sep1(rule, separator) {
    return seq(rule, repeat(seq(separator, rule)));
}
