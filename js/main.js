/**
 * Move nodes toward cluster focus
 * Mike Bostock
 * https://bl.ocks.org/mbostock/1804919
 */
function gravity(alpha) {
    return function(d) {
        d.y += (d.cy - d.y) * alpha;
        d.x += (d.cx - d.x) * alpha;
    };
}

/* Create number formatter function */
var format_number = d3.format(",.2f");

/* Initialize calculation and input values */
var bmr = 0,
    bmi = 0,
    age,
    weight,
    height,
    sex,
    activity_level;

/* Initialize default plate foods */
var defaults = [
    "AMS 131",
    "CMPE 107"
];

/* Create categories */
var categories = [
    {
        name: "Programming Introduction",
        type: "fruit",
        row: 1,
        col: 1,
        color: "#b5bd68"
    },
    {
        name: "Physics or Chemistry",
        type: "pastry",
        row: 1,
        col: 2,
        color: "#a3685a"
    },
    {
        name: "Statistics",
        type: "beverage",
        row: 1,
        col: 3,
        color: "#81a2be"
    },
    {
        name: "",
        type: "egg-meat",
        row: 2,
        col: 1,
        color: "#cc6666"
    },
    {
        name: "",
        type: "cereal",
        row: 2,
        col: 2,
        color: "#f0c674"
    },
    {
        name: "",
        type: "other",
        row: 2,
        col: 3,
        color: "#b294bb"
    }
];

/* Create category lookup */
var category_lookup = categories.reduce(function(lookup, c, i) {
    lookup[c.type] = i;
    return lookup;
}, {});

/* Initialize menu settings */
var m_margin = {top: 0, right: 0, bottom: 0, left: 0},
    m_width  = 840 - m_margin.left - m_margin.right,
    m_height = 600 - m_margin.top - m_margin.bottom,
    m_radius = 32,
    m_padding = 48;

/* Initialize plate settings */
var p_margin = {top: 0, right: 0, bottom: 0, left: 0},
    p_width  = 440 - p_margin.left - p_margin.right,
    p_height = 600 - p_margin.top - p_margin.bottom,
    p_radius = 32,
    p_padding = 0,
    p_count = 0,
    p_data = [];

/* Create menu canvas */
var menu = d3.select("#menu")
        .attr("style", 
        	"width:" + (m_width + m_margin.left + m_margin.right) + 
        	"px;height:" + (m_height + m_margin.top + m_margin.bottom) + "px;")
        .append("svg")
        .attr("width", m_width + m_margin.left + m_margin.right)
        .attr("height", m_height + m_margin.top + m_margin.bottom)
        .append("g")
        .attr("transform", "translate(" + m_margin.left + "," + m_margin.top + ")");

/* Import and process foods data */
d3.json("src/json/foods.json", function(error, m_data) {
    if (error) throw error;

    /* Iterate over data */
    m_data.forEach(function(d) {
        /* Get default food occurrence count */
        var count = defaults.reduce(function(n, f) {
            return n + (f === d.food ? 1 : 0);
        }, 0);

        /* Set focus */
        d.row = categories[category_lookup[d.type]].row;
        d.col = categories[category_lookup[d.type]].col;

        /* Set color */
        d.color = categories[category_lookup[d.type]].color;

        /* Set position */
        d.cy = d.row * Math.floor(m_height / 2) - Math.floor(m_height / 4);
        d.cx = d.col * Math.floor(m_width / 3) - Math.floor(m_width / 6);

        /* Set radius */
        d.radius = m_radius;

        /* Add default foods to plate */
        for (var i = 0; i < count; i++) {
            p_data.push({
                "food": d.food,
                "type": d.type,
                "img": d.img,
                "serving": d.serving,
                "calories": d.calories,
                "cholesterol": d.cholesterol,
                "sodium": d.sodium,
                "color": d.color,
                "radius": p_radius,
                "cx": p_width / 2,
                "cy": p_height / 2
            });
        }
    });

    /* Initialize default plate */
    p_start(false);

    /* Initialize default recommendation */
    handle_form_inputs();

    /* Initialize default table values */
    update_plate_totals();

    /* Initialize tooltip */
    var m_tip = d3.tip()
        .attr("class", "d3-tip")
        .offset(function(d) {
            return [d.row === 1 ? 6 : -6, 0];
        })
        .direction(function(d) {
            return d.row === 1 ? "s" : "n";
        })
        .html(function(d) {
        var data = "<strong><em>" + d.food + "</em></strong>";

        data += "<div class='clearfix'><strong>Units: </strong><em>"       + d.serving       + "</em></div>";
        data += "<div class='clearfix'><strong>Prereq: </strong><em>"      + d.calories      + "</em></div>";
        data += "<div class='clearfix'><strong>Season: </strong><em>"   + d.cholesterol   + "</em></div>";
        data += "<div class='clearfix'><strong>Description: </strong><em>"        + d.sodium        + "</em></div>";

            return data;
        });

    /* Invoke tooltip */
    menu.call(m_tip);

    /* Create force layout */
    var m_force = d3.layout.force()
        .nodes(m_data)
        .size([m_width, m_height])
        .gravity(0)
        .charge(0)
        .on("tick", m_tick)
        .start();

    /* Create nodes */
    var m_node = menu.selectAll(".node")
        .data(m_data)
        .enter().append("g");

    /* Create circles */
    var m_circle = m_node.append("circle")
        .attr("class", "circle")
        .attr("r", function() { return m_radius; })
        .style("fill", function(d) { return d.color; })
        .on("mouseover", m_tip.show)
        .on("mouseleave", m_tip.hide)
        .on("click", function(d) {
            p_data.push({
                "food": d.food,
                "type": d.type,
                "img": d.img,
                "serving": d.serving,
                "calories": d.calories,
                "cholesterol": d.cholesterol,
                "sodium": d.sodium,
                "color": d.color,
                "radius": p_radius,
                "cx": p_width / 2,
                "cy": p_height / 2
            });

            p_start(false);

            update_plate_totals();
        });

    /* Create images */
    var m_img = m_node.append("image")
        .attr("class", "image")
        .attr("width", "52")
        .attr("height", "52")
        .attr("xlink:href", function(d) { return "src/img/" + d.type + "/" + d.img + ".png"; });

    /* Create labels */
    var m_label = menu.selectAll(".category")
        .data(categories)
        .enter().append("text")
            .attr("class", "category")
            .attr("text-anchor", "middle")
            .attr("x", function(d) { return d.col * Math.floor(m_width / 3) - Math.floor(m_width / 6); })
            .attr("y", function(d) { return d.row * Math.floor(m_height / 2) - Math.floor(m_height / 4) + (d.row === 1 ? -135 : 135); })
            .text(function(d) { return d.name; });

    /**
     * Mike Bostock
     * https://bl.ocks.org/mbostock/1804919
     */
    function m_tick(e) {
        m_circle
            .each(gravity(0.5 * e.alpha))
            .each(m_collide(0.85))
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        m_img
            .each(gravity(0.5 * e.alpha))
            .each(m_collide(0.85))
            .attr("x", function(d) { return d.x - m_radius / 2 - 10; })
            .attr("y", function(d) { return d.y - m_radius / 2 - 10; });
    }

    /**
     * Resolve collisions between nodes
     * Mike Bostock
     * https://bl.ocks.org/mbostock/1804919
     */
    function m_collide(alpha) {
        var quadtree = d3.geom.quadtree(m_data);

        return function(d) {
            var r = d.radius + m_radius + m_padding,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;

            quadtree.visit(function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                    var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + quad.point.radius + (d.color !== quad.point.color) * m_padding;

                    if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }

                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }
});

/* Create plate canvas */
var plate = d3.select("#plate")
        .attr("style", "width:" + (p_width + p_margin.left + p_margin.right) + "px;height:" + (p_height + p_margin.top + p_margin.bottom) + "px;")
        
        .append("svg")
        .attr("width", p_width + p_margin.left + p_margin.right)
        .attr("height", p_height + p_margin.top + p_margin.bottom)
        
        .append("g")
        .attr("transform", "translate(" + p_margin.left + "," + p_margin.top + ")");

/* Initialize tooltip */
var p_tip = d3.tip()
    .attr("class", "d3-tip")
    .offset([-6, 0])
    .html(function(d) {
        var data = "<strong><em>" + d.food + "</em></strong>";

        data += "<div class='clearfix'><strong>Units: </strong><em>"       + d.serving       + "</em></div>";
        data += "<div class='clearfix'><strong>Prereq: </strong><em>"      + d.calories      + "</em></div>";
        data += "<div class='clearfix'><strong>Season: </strong><em>"   + d.cholesterol   + "</em></div>";
        data += "<div class='clearfix'><strong>Description: </strong><em>"        + d.sodium        + "</em></div>";

        return data;
    });

/* Invoke tooltip */
menu.call(p_tip);

/* Create force layout */
var p_force = d3.layout.force()
    .nodes(p_data)
    .size([p_width, p_height])
    .gravity(0)
    .charge(0)
    .on("tick", p_tick)
    .start();

/* Initialize nodes */
var p_node = plate.selectAll(".node");

/* Initialize circles */
var p_circle;

/* Initialize images */
var p_img;

/**
 * Mike Bostock
 * https://bl.ocks.org/mbostock/1804919
 */
function p_tick(e) {
    if (p_circle !== undefined) {
        p_circle
            .each(gravity(0.5 * e.alpha))
            .each(p_collide(0.85))
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        p_img
            .each(gravity(0.5 * e.alpha))
            .each(p_collide(0.85))
            .attr("x", function(d) { return d.x - p_radius / 2 - 10; })
            .attr("y", function(d) { return d.y - p_radius / 2 - 10; });
    }
}

/**
 * Resolve collisions between nodes
 * Mike Bostock
 * https://bl.ocks.org/mbostock/1804919
 */
function p_collide(alpha) {
    var quadtree = d3.geom.quadtree(p_data);

    return function(d) {
        var r = d.radius + p_radius + p_padding,
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;

        quadtree.visit(function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                    y = d.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + quad.point.radius + (d.color !== quad.point.color) * p_padding;

                if (l < r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }

            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
    };
}

/**
 * Modifying a force layout
 * Mike Bostock
 * https://bl.ocks.org/mbostock/1095795
 */
function p_start(removal) {
    /* Update node */
    p_node = p_node.data(p_data);

    /* Remove old circles and images */
    p_node.selectAll(".p-" + p_count).remove();

    /* Remove old nodes */
    p_node.exit().remove();

    /* Increment count */
    p_count++;

    /* Create node */
    p_node
        .enter()
        .append("g");

    /* Create circle */
    p_circle = p_node
        .data(p_data)
        .append("circle")
            .attr("class", "circle p-" + p_count)
            .attr("r", function() { return p_radius; })
            .style("fill", function(d) { return d.color; })
            .on("mouseover", p_tip.show)
            .on("mouseleave", p_tip.hide)
            .on("click", function(d) {
                p_data.splice(d.index, 1);

                p_start(true);

                update_plate_totals();
            });

    /* Create image */
    p_img = p_node
        .data(p_data)
        .append("image")
            .attr("class", "image p-" + p_count)
            .attr("width", "52")
            .attr("height", "52")
            .attr("xlink:href", function(d) { return "src/img/" + d.type + "/" + d.img + ".png"; });

    /* Hide tooltip */
    if (removal) {
        p_tip.hide();
    }

    p_force.start();
}

/* Handle clear plate button */
d3.select("#clear_plate").on("click", function() {
    p_data.splice(0, p_data.length)

    p_start(true);

    update_plate_totals();
});

/* Handle input changes */
d3.selectAll("input, select").on("change", handle_form_inputs);

/* Handle form inputs */
function handle_form_inputs() {
    /* Gather input values */
    age = parseInt(d3.select("#age").node().value);
    weight = parseInt(d3.select("#weight").node().value);
    height = parseInt(d3.select("#height").node().value);
    sex = d3.select("#sex").node().value;
    activity_level = d3.select("#activity_level").node().value;

    /* Validate input values */
    if (!isNaN(age)
        && !isNaN(weight)
        && !isNaN(height)
        && (sex === "m"
            || sex === "f")
        && (activity_level === "sedentary"
            || activity_level === "lightly_active"
            || activity_level === "moderately_active"
            || activity_level === "very_active"
            || activity_level === "extra_active")) {
        /* Update recommendation */
        update_recommendation()
    }
}

/* Update plate totals */
function update_plate_totals() {
    /* Initialize nutrient totals */
    var calories = 0,
        cholesterol = 0,
        sodium = 0,
        fat = 0;

    /* Sum nutrient totals */
    for (var i = 0; i < p_data.length; i++) {
        calories += p_data[i].calories;
        cholesterol += p_data[i].cholesterol;
        sodium += p_data[i].sodium;
        fat += p_data[i].fat;
    }

    /* Update table values */
    d3.select("#your_plate_calories").text(format_number(calories)).classed("your_plate_warning", calories > bmi / 4);
    d3.select("#your_plate_cholesterol").text(format_number(cholesterol)).classed("your_plate_warning", cholesterol > 250);
    d3.select("#your_plate_sodium").text(format_number(sodium)).classed("your_plate_warning", sodium > 575);
    d3.select("#your_plate_fat").text(format_number(fat)).classed("your_plate_warning", fat > bmi * 0.30 / 16);
}

/**
 * Update recommendation
 * Based on the Harris-Benedict equation
 * https://en.wikipedia.org/wiki/Harris%E2%80%93Benedict_equation
 */
function update_recommendation() {
    if (sex === "m") {
        bmr = 66 + (6.23 * weight) + (12.7 * height) - (6.8 * age);
    } else if (sex === "f") {
        bmr = 655 + (4.35 * weight) + (4.7 * height) - (4.7 * age);
    }

    if (activity_level === "sedentary") {
        bmi = Math.floor(bmr * 1.2);
    } else if (activity_level === "lightly_active") {
        bmi = Math.floor(bmr * 1.375);
    } else if (activity_level === "moderately_active") {
        bmi = Math.floor(bmr * 1.55);
    } else if (activity_level === "very_active") {
        bmi = Math.floor(bmr * 1.725);
    } else if (activity_level === "extra_active") {
        bmi = Math.floor(bmr * 1.9);
    }

    /* Update table values */
    d3.select("#recommendation_calories").text(format_number(bmi / 4));
    d3.select("#recommendation_cholesterol").text(format_number(250));
    d3.select("#recommendation_sodium").text(format_number(575));
    d3.select("#recommendation_fat").text(format_number(bmi * 0.30 / 16));
}
