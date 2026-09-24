import { chromium } from "playwright";
import QRCode from "qrcode";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const DEPARTMENTS_DIVIDER_PHOTO = `data:image/jpeg;base64,${readFileSync(path.join(repoRoot, "assets/images/page-images/divider-bg-departments.jpg")).toString("base64")}`;

// Maps each office's name (DEPARTMENTS[].name) to its live page on the
// budget site, so every department page can carry a QR code to the fuller
// online version -- instead of the QR only appearing for the dozen or so
// offices that happen to have a public video. Tourism Administration's
// four divisions share one live page (tourism-administration.html) split
// into sections; the anchors match the slugified ids
// renderTourismAdministrationSections gives those sections (see
// DEPARTMENT_PAGE_ANCHOR_OVERRIDES in assets/budget-data.js). Beach
// Renourishment and Beach Tram are line items within the Beach Operations
// page, with no dedicated section of their own, so they link to the plain
// page like Beach Operations itself.
const DEPARTMENT_PAGE_HREFS = new Map([
  ["Building Construction and Maintenance", "building-construction-and-maintenance.html"],
  ["Building Department", "building-department.html"],
  ["Code Compliance", "code-compliance.html"],
  ["County Administration", "county-administration.html"],
  ["Eagle Springs Golf and Recreation Center", "eagle-springs-golf-and-recreation-center.html"],
  ["Eagle Springs Grill", "eagle-springs-grill.html"],
  ["Emergency Management", "emergency-management.html"],
  ["Engineering Department", "engineering-department.html"],
  ["Environmental Resources", "environmental-resources.html"],
  ["Extension Office", "extension-office.html"],
  ["Geographic Info Systems", "geographic-info-systems.html"],
  ["Housing & Urban Development", "housing-and-urban-development.html"],
  ["Human Resources", "human-resources.html"],
  ["Libraries", "libraries.html"],
  ["Mosquito Control", "mosquito-control.html"],
  ["Mossy Head Wastewater Treatment Facility", "mossy-head-wastewater-treatment-facility.html"],
  ["Office of Management and Budget", "office-of-management-and-budget.html"],
  ["Office of the County Attorney", "office-of-the-county-attorney.html"],
  ["Planning", "planning.html"],
  ["Probation", "probation.html"],
  ["Public Works", "public-works.html"],
  ["Purchasing", "purchasing.html"],
  ["Recreation", "recreation.html"],
  ["Soil Conservation", "soil-conservation.html"],
  ["Solid Waste", "solid-waste.html"],
  ["Veteran Services", "veteran-services.html"],
  ["Tourism Administration", "tourism-administration.html"],
  ["Sales and Visitors Center", "tourism-administration.html#sales-and-visitor-center"],
  ["Communications", "tourism-administration.html#communications"],
  ["Marketing", "tourism-administration.html#marketing"],
  ["Beach Operations", "tourism-beach-operations.html"],
  ["Beach Tram", "tourism-beach-operations.html"]
]);

// Rebuilds the FY 2027 Budget Book's "Departments and Services" chapter
// -- one full magazine-quality page per department, addressing GFOA
// Distinguished Budget Presentation departmental-section criteria:
// statement of function (mission), department goal, services and
// service-level changes, challenges/issues, who funds the department
// (revenues), major contracts, expenditures by category (Personnel /
// Contractual / Operating / Capital, shown separately per explicit
// request), staffing, and performance measures with multi-year actual
// results and an FY2027 target.
//
// Source: this book's own raw capture of pages/[department].html for
// each office plus two research passes -- the first for Statement of
// Function/Goal/Performance Measures, the second specifically for the
// Contractual Services breakout, Challenges text, Fund source, Revenue
// sources, and itemized named contracts (vendor, agreement, amount).
//
// A "contractual" dollar figure below is the portion of the office's
// own Operating Expenditures that is purchased/contracted services --
// "operating" is what remains after subtracting it, so the two together
// always equal the office's original combined operating total. Two
// The Solid Waste $17,000,000 franchise agreement is tracked separately
// from the office's normal operating ledger on the live site and is listed
// under Contracts with a note. The County Attorney's $650,000 Clay Adkinson
// legal-services agreement is included in Contractual Services so the
// profile reconciles to the Department Operating Ledger.
//
// Tourism is presented at the office level so the printed chapter mirrors
// the explorer hierarchy without double-counting a department rollup.
//
// "Changes" narrative: the live site auto-generates a "primary change"
// sentence per office, but several instances contradict the office's
// own displayed FTE change (e.g. citing "additional staffing" for an
// office whose FTE count didn't move) -- these generic, unverifiable
// instances are omitted. Only causal clauses naming a specific,
// verifiable expense category are kept.

const DEPARTMENTS = [
  {
    name: "Building Construction and Maintenance", fte: 68, personnel: 5427755, operating: 2933550, contractual: 235000, capital: 316000,
    deltaP: 169587, deltaO: -212450, deltaC: -1031000, video: "WJxzKl9sRNk", fund: "General Fund",
    sof: "The Building Construction and Maintenance Department includes the Facilities Maintenance, Custodian, and Parks Maintenance divisions. Facilities Maintenance provides new construction, remodeling, repair, maintenance, and treatment-plant maintenance assistance to support County departments and Constitutional offices. Parks maintains the grounds of parks, ballfields, County office building lawns, community centers, irrigation, fencing, playground equipment, and parking lot islands. Custodian provides cleaning services to County offices countywide.",
    goal: "Provide safe, reliable, and efficient public facilities for County employees, residents, and visitors.",
    services: [
      ["Build and renew county facilities", "Plans and delivers construction, renovation, and major repair projects for county buildings."],
      ["Maintain public buildings", "Keeps county facilities safe, functional, and available for the people who use them."],
      ["Manage facility systems", "Coordinates building systems, preventive maintenance, and service requests across county operations."]
    ],
    challenges: "The work plan includes aging facilities, new construction, preventive maintenance, and daily service requests competing for the same crews and project schedules.",
    changeNote: "Infrastructure decreasing by $855,000.",
    revenue: "General Government Taxes &mdash; Ad Valorem Taxes $1,426,130 &middot; Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $6,350,567 &middot; Intergovernmental Revenues &mdash; State Revenue Share Proceeds $792,317 &middot; Miscellaneous Revenue &mdash; Indirect Administrative Fees $278,291 &middot; Miscellaneous Revenue &mdash; Morrison Springs Entry Fee $65,000",
    capitalItems: [
      { item: "Crew Cab Truck (Replacement) &times;2", amount: 136000 },
      { item: "Van (Replacement) &times;2", amount: 90000 },
      { item: "52\" Lawn Mower (New) &times;2", amount: 22000 },
      { item: "Crew Cab Truck &mdash; New Morrison Springs Attendant (New)", amount: 68000 }
    ],
    contracts: [
      { service: "Elevator Maintenance Contract", provider: "KONE", amount: 25000 },
      { service: "Pest Management Services", provider: "Terminix", amount: 45000 },
      { service: "Park Field Spraying & Fertilizer Services", provider: "PPM Sports Turf, LLC", amount: 165000 }
    ],
    pms: [
      { q: "Number of work orders completed within the department's established timeframe per fiscal year", obj: "Complete ≥ 3,000 work orders annually within the department's established timeframes", y: ["3,000", "3,200", "3,439", "3,600"], target: "3,800", svc: 2 },
      { q: "Number of facilities maintained and inspected per year", obj: "Inspect and maintain County facilities and parks per year", y: ["113", "116", "115", "115"], target: "115", svc: 1 }
    ]
  },
  {
    name: "Building Department", fte: 21, personnel: 2312201, operating: 1016059, indirect: 671740, contractual: 0, capital: 0,
    deltaP: 198043, deltaO: -233043, deltaC: -165000, video: "3n4ns8jANzQ", fund: "Building Fund",
    sof: "The Building Department administers construction permitting and building-code compliance. Staff issue contractor licenses, review permit applications and plans, and inspect permitted work at required stages of construction.",
    goal: "Deliver timely, consistent permitting and inspections that support safe, code-compliant construction.",
    services: [
      ["Review building plans", "Checks proposed construction for compliance with applicable building and safety requirements."],
      ["Issue permits", "Processes permits that authorize eligible construction, alteration, and related work."],
      ["Inspect construction", "Verifies permitted work at required stages before completion or occupancy."]
    ],
    challenges: "Twenty-one Building Fund positions plan for 28,000 inspections and 1,700 contractor licenses, funded by permit fees rather than property taxes.",
    changeNote: "Operating Supplies decreasing by $214,429.",
    revenue: "Other Sources &mdash; Nonoperating Balance Brought Forward $4.0M",
    contracts: [],
    pms: [
      { q: "Number of building inspections conducted successfully per fiscal year", obj: "Complete building inspections annually with ≥ 98% accuracy", y: ["27,304", "27,502", "25,767", "28,000"], target: "28,000", svc: 2 },
      { q: "Number of contractor licenses issued and/or renewed per fiscal year", obj: "Issue or renew contractor licenses to qualified applicants", y: ["1,364", "1,468", "1,664", "1,700"], target: "1,700", svc: 1 }
    ]
  },
  {
    name: "Code Compliance", fte: 43, personnel: 4260744, operating: 463510, contractual: 87600, capital: 148800,
    deltaP: 352585, deltaO: 10110, deltaC: -265200, video: "Z78NL7Z-urs", fund: "General Fund",
    sof: "The primary function of Code Compliance is to uphold and enhance the aesthetics, property values, health and safety, and overall quality of life for the residents and visitors of Walton County, achieved through the fair, consistent, and equitable enforcement of codes, regulations, and ordinances across both Street and Beach enforcement areas.",
    goal: "Promote voluntary compliance to maintain community standards and resolve code violations.",
    services: [
      ["Respond to code concerns", "Receives and investigates reported conditions that may violate county codes."],
      ["Resolve property violations", "Works with property owners to correct documented violations and restore compliance."],
      ["Support neighborhood standards", "Conducts field activity and case follow-up that protect community health, safety, and appearance."]
    ],
    challenges: "Forty-three positions cover street and beach enforcement, with a target of resolving 95% of violations through voluntary compliance.",
    revenue: "Tourist Development Tax Reimbursement $2.2M &middot; Permits, Fees & Special Assessments $1.8M &middot; Charges for Services $400K &middot; General Government Taxes $331K",
    capitalItems: [
      { item: "SUV (Replacement) &times;2", amount: 72000 },
      { item: "UTV (New) &times;4", amount: 76800 }
    ],
    contracts: [
      { service: "Special Magistrate Services", provider: "Hand Arendall Harrison", amount: 87600 }
    ],
    pms: [
      { q: "Percentage of code violations resolved through voluntary compliance without formal enforcement action", obj: "Encourage voluntary compliance through education and outreach", y: ["93.5%", "93.5%", "94%", "94%"], target: "95%", svc: 1 },
      { q: "Total number of street and beach code cases resolved annually", obj: "Efficiently resolve all identified street and beach code cases annually", y: ["10,643", "10,865", "10,215", "11,500"], target: "8,000", svc: 0 }
    ]
  },
  {
    name: "County Administration", fte: 16, ftePrior: 17, ftePositions: ["Administrative Assistant"], personnel: 2061039, operating: 134000, contractual: 0, capital: 65000,
    fteRollupNote: "Personnel Ledger: County Administration Offices remains at 76 FTE because this reduction is offset by Veteran Services' 1-FTE increase.",
    deltaP: -26864, deltaO: 2000, deltaC: 65000, video: null, fund: "General Fund",
    sof: "County Administration carries out Board direction, coordinates work across Board departments, and serves as a point of contact for residents. It also coordinates with Constitutional Officers and municipalities on countywide matters.",
    goal: "Deliver effective and transparent administration to support County operations.",
    services: [
      ["Carry out Board direction", "Coordinates implementation of policies and decisions adopted by the Board of County Commissioners."],
      ["Coordinate county operations", "Aligns departments, priorities, and executive decisions across Board-controlled government."],
      ["Serve as the public's point of contact", "Acts as the primary interface for citizens and a liaison to Constitutional offices and municipalities."]
    ],
    challenges: "Sixteen positions coordinate Board directives, interdepartmental decisions, public inquiries, and relationships with Constitutional Officers and municipalities.",
    changeNote: "Machinery & Equipment increasing by $65,000.",
    revenue: "General Government Taxes &mdash; Ad Valorem Taxes $1,847,203 &middot; Miscellaneous Revenue &mdash; Indirect Administrative Fees $412,836",
    capitalItems: [
      { item: "SUV (New)", amount: 65000 }
    ],
    contracts: [],
    pms: [
      { q: "Number of BCC directives, task orders, and agreements processed annually", obj: "Ensure timely implementation of BCC directives, task orders, and agreements", y: ["213", "215", "368", "350"], target: "360", svc: 0 },
      { q: "Number of public videos created on social media platforms", obj: "Create and publish more public videos to communicate initiatives and services", y: ["65", "83", "105", "120"], target: "130", svc: 2 }
    ]
  },
  {
    name: "Eagle Springs Golf and Recreation Center", fte: 12, personnel: 903055, operating: 596500, contractual: 100000, capital: 206000,
    deltaP: 33511, deltaO: 23500, deltaC: -225500, video: "d4o7JNx6o4s", fund: "General Fund",
    sof: "Walton County owns one golf course, Eagle Springs Golf and Recreation Center, purchased by the Board of County Commissioners in 2019 to provide economic development and enhance quality of life through sports and recreation. Eagle Springs consists of 190 acres containing an 18-hole golf course and four spring-fed lakes, with more than 30,000 rounds played annually, a driving range, pro shop, pickleball courts, a public swimming pool, and a walking path.",
    goal: "Provide high-quality and accessible recreational opportunities for all residents and visitors.",
    challenges: "Twelve positions support a target of 43,000 rounds, up from 38,514 in 2025, with user fees covering about $1.4M of the $1.8M budget.",
    changeNote: "Buildings decreasing by $250,000.",
    revenue: "Charges for Services &mdash; Membership, Green & Cart Fees $1.4M &middot; Intergovernmental Revenues $416K",
    capitalItems: [
      { item: "Course & Grounds Infrastructure (New)", amount: 125000 },
      { item: "Reel Grinder (New)", amount: 68000 },
      { item: "Golf Lift (New)", amount: 13000 }
    ],
    contracts: [
      { service: "Equipment Lease", provider: "Wells Fargo Financial Leasing, Inc", amount: 100000 }
    ],
    pms: [
      { q: "Total number of rounds played per fiscal year", obj: "Maintain and improve the quality of facilities, programs, and events to meet community needs", y: ["29,878", "31,153", "33,589", "38,514"], target: "43,000" },
      { q: "Total number of pool attendees during the open season", obj: "Maintain and improve the quality of facilities, programs, and events to meet community needs", y: ["2,858", "3,018", "2,606", "2,700"], target: "2,750" }
    ]
  },
  {
    name: "Eagle Springs Grill", fte: 6, personnel: 385100, operating: 176900, contractual: 8000, capital: 0,
    deltaP: 15116, deltaO: -23000, deltaC: 0, video: "a4VPeQNr1M8", fund: "General Fund",
    sof: "Eagle Springs Grill provides food and beverage service for golfers, pool visitors, charity tournaments, and private events such as receptions, reunions, and family gatherings.",
    goal: "Provide exceptional dining and event services that enhance community engagement.",
    challenges: "The Grill plans for 60,000 guest checks and 65 events while food, supply, and labor costs remain variable.",
    changeNote: "Operating Supplies decreasing by $35,800.",
    revenue: "Charges for Services &mdash; Grill Food & Beverage Revenue $440K &middot; Intergovernmental Revenues $130K",
    contracts: [
      { service: "Dishwasher Maintenance Agreement", provider: "Auto-Chlor Services, LLC", amount: 8000 }
    ],
    pms: [
      { q: "Total number of guest checks processed per fiscal year", obj: "Maintain high standards of food quality and service while hosting events that support community and financial goals", y: ["7,824", "39,048", "50,206", "55,000"], target: "60,000" },
      { q: "Number of events hosted", obj: "Maintain high standards of food quality and service while hosting events that support community and financial goals", y: ["5", "42", "50", "55"], target: "65" }
    ]
  },
  {
    name: "Emergency Management", fte: 6, ftePrior: 5.5, ftePositions: ["Technology Coordinator"], personnel: 704526, operating: 176829, contractual: 6100, capital: 25000,
    deltaP: 43275, deltaO: 40029, deltaC: 0, video: "7arI_NS6Q2U", fund: "General Fund",
    sof: "Emergency Management coordinates preparedness, response, recovery, and mitigation around the clock. During disasters, the Emergency Operations Center connects government agencies, nonprofit organizations, businesses, and community partners for communications, command, and resource coordination.",
    goal: "Enhance community preparedness, readiness, and resilience through education, training, outreach, and volunteer engagement.",
    services: [
      ["Prepare for emergencies", "Develops plans, training, and coordination arrangements before disasters occur."],
      ["Coordinate emergency response", "Connects agencies, information, and resources during an emergency activation."],
      ["Support community recovery", "Coordinates recovery information, assistance, and continuity after an emergency."]
    ],
    challenges: "Six positions, after a half-position increase for a Technology Coordinator, maintain year-round readiness and plan 24 outreach events reaching 22,000 people.",
    revenue: "Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $912K",
    capitalItems: [
      { item: "UTV (Replacement)", amount: 15000 },
      { item: "Harris XL 200 Radio (New)", amount: 10000 }
    ],
    contracts: [
      { service: "Disaster Management Software", provider: "ESI Acquisition, Inc", amount: 4100 },
      { service: "Weather Monitoring Services", provider: "WeatherSTEM, Inc", amount: 2000 }
    ],
    pms: [
      { q: "Number of community outreach events held, and total participants reached per fiscal year", obj: "Enhance community preparedness through outreach and education", y: ["23 / 20,000", "23 / 20,000", "23 / 21,000", "24 / 22,000"], target: "24 / 22,000", svc: 0 },
      { q: "Number of CERT volunteer hours contributed per fiscal year", obj: "Increase volunteer engagement through CERT to build capacity and resilience", y: ["2,500", "2,500", "2,500", "2,500"], target: "2,500", svc: 1 }
    ]
  },
  {
    name: "Engineering Department", fte: 14, ftePrior: 16, ftePositions: ["Administrative Assistant", "Administrative Project Coordinator"], personnel: 2083118, operating: 151000, contractual: 100000, capital: 45000,
    fteRollupNote: "Personnel Ledger: 15 FTE = Engineering 14 + Mossy Head Wastewater 1.",
    deltaP: -95460, deltaO: 0, deltaC: 0, video: null, fund: "Transportation Fund",
    sof: "The primary function of the County Engineering Department is to manage the design and construction of Walton County infrastructure projects, including capital improvement design and construction management, traffic operations, right-of-way permitting, surveying, FDOT grant administration, and utility/engineering oversight for the Mossy Head sewer system.",
    goal: "Plan and deliver safe, resilient infrastructure through disciplined engineering, project development, and capital coordination.",
    services: [
      ["Design and manage capital projects", "Provides in-house capital improvement design and construction management for county infrastructure."],
      ["Oversee traffic and right-of-way", "Coordinates traffic operations, right-of-way permitting, and surveying for county roadways."],
      ["Administer transportation grants", "Manages FDOT grant administration and engineering oversight for the Mossy Head sewer system."]
    ],
    achievement: { label: "In-House Engineering Savings", detail: "Performing capital improvement design and construction management in-house, rather than through outside consultants, is estimated to save the County $1,660,880 in FY2027." },
    challenges: "Fourteen positions, down two, provide in-house design and construction management for 30 funded transportation and infrastructure projects.",
    revenue: "General Government Taxes &mdash; Local Option Fuel Tax $2.4M",
    capitalItems: [
      { item: "4x4 Crew Cab Truck (New)", amount: 45000 }
    ],
    contracts: [
      { service: "Professional Services (task order, capital improvement projects)", provider: "Not listed", amount: 100000 }
    ],
    pms: [
      { q: "Was the five-year Capital Improvement Plan (CIP) updated and approved?", obj: "Update and gain approval of the five-year Capital Improvement Plan annually", y: ["N/A", "N/A", "Yes", "Yes"], target: "Yes", svc: 0 },
      { q: "Has the department website been updated to reflect the current status of active projects?", obj: "Maintain the department website with current information on active projects", y: ["N/A", "N/A", "Yes", "Yes"], target: "Yes" }
    ]
  },
  {
    name: "Environmental Resources", fte: 4, personnel: 451831, operating: 114216, contractual: 62875, capital: 20000,
    deltaP: 1304, deltaO: -168284, deltaC: -25000, video: null, fund: "General Fund",
    sof: "Environmental Resources manages water-quality monitoring, environmental compliance, habitat restoration, conservation projects, and technical coordination with residents and government agencies.",
    goal: "Protect and enhance Walton County's natural resources through proactive conservation, compliance, and restoration initiatives.",
    challenges: "Four positions cover regulatory inspections, water-quality work, restoration projects, public access, and coordination with state, federal, and local agencies.",
    changeNote: "Other Services decreasing by $180,000.",
    revenue: "General Government Taxes &mdash; Ad Valorem Taxes $641K &middot; Permits, Fees & Special Assessments $8K",
    capitalItems: [
      { item: "ATV Side-by-side (New)", amount: 17500 },
      { item: "ATV Trailer (New)", amount: 2500 },
      { item: "Vessel & Trailer (New) &mdash; requested, not funded", amount: 60000, notFunded: true }
    ],
    contracts: [
      { service: "Choctawhatchee Bay Water Quality Contract", provider: "Choctawhatchee Basin Alliance", amount: 36000 },
      { service: "Coastal Dune Lake Water Quality Contract", provider: "Choctawhatchee Basin Alliance", amount: 26875 }
    ],
    pms: [
      { q: "Number of stormwater inspections performed and compliance with NPDES regulations", obj: "Conduct regular stormwater inspections to ensure compliance with NPDES and environmental regulations", y: ["77", "77", "78", "80"], target: "80" },
      { q: "Number of environmental conservation projects completed per fiscal year (e.g. reef deployments, habitat plans)", obj: "Implement and complete environmental conservation projects to improve ecosystem health", y: ["10", "10", "10", "12"], target: "13" }
    ]
  },
  {
    name: "Extension Office", fte: 8.5, personnel: 514924, operating: 39395, contractual: 0, capital: 40000, other: 3000,
    deltaP: -23186, deltaO: -20205, deltaC: 0, video: "ZNGKeoZlogc", fund: "General Fund",
    sof: "The Walton County Extension Service provides scientifically based information for current and pertinent issues that enable county residents to make informed decisions that improve their quality of life. Access to this knowledge is provided by University of Florida trained professionals (extension agents), cooperatively funded by the County, the University of Florida, the U.S. Department of Agriculture, and other joint cooperators.",
    goal: "Provide relevant, research-based education and outreach to improve the quality of life for Walton County residents.",
    challenges: "Eight and a half positions, cooperatively funded with the University of Florida, plan for 5,000 program participants and 2,600 client consultations.",
    changeNote: "Machinery & Equipment increasing by $40,000.",
    revenue: "Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $597K",
    capitalItems: [
      { item: "4x4 Crew Cab Truck (Replacement)", amount: 40000 }
    ],
    contracts: [],
    pms: [
      { q: "Number of participants attending extension educational programs per calendar year", obj: "Deliver engaging educational programs to meet community needs", y: ["6,582", "6,582", "5,110", "5,000"], target: "5,000" },
      { q: "Number of client consultations performed per calendar year", obj: "Offer individualized client consultations to support informed decision-making", y: ["2,675", "2,675", "2,899", "2,600"], target: "2,600" }
    ]
  },
  {
    name: "Geographic Info Systems", fte: 6, personnel: 682221, operating: 96625, contractual: 60300, capital: 0,
    deltaP: 15651, deltaO: 21680, deltaC: 0, video: null, fund: "General Fund",
    sof: "The Walton County Geographic Information Systems (GIS) Department manages a Geographic Information System and provides geographic services, data, products, and resources to multiple users including county offices, other agencies, and the public to aid in decision making.",
    goal: "Provide accessible, accurate, and innovative GIS resources to support decision-making and improve customer service.",
    challenges: "Six positions maintain countywide spatial data and target 4,250 customer requests and 2,700 maps, up from 4,000 and 2,420 in 2025.",
    revenue: "General Government Taxes $350K &middot; Intergovernmental Revenues $282K &middot; Miscellaneous Revenue $105K",
    contracts: [
      { service: "Enterprise GIS Software & Mapping Services", provider: "Environmental Systems Research Institute (ESRI)", amount: 60300 }
    ],
    pms: [
      { q: "Customer GIS assistance (walk-ins, email, phone) for address, GIS maps, website, and interactive maps", obj: "Enhance customer support through timely GIS assistance and produce accurate maps and interactive tools", y: ["3,782", "3,782", "3,900", "4,000"], target: "4,250" },
      { q: "Maps produced (paper and digital)", obj: "Develop and maintain comprehensive GIS data and produce accurate maps", y: ["2,497", "2,497", "2,350", "2,420"], target: "2,700" }
    ]
  },
  {
    name: "Housing & Urban Development", fte: 3, personnel: 340806, operating: 2704750, contractual: 11500, capital: 0,
    deltaP: 19911, deltaO: -44250, deltaC: 0, video: null, fund: "Housing & Urban Development Fund",
    sof: "The Section 8 tenant-based Housing Choice Voucher (HCV) assistance program is funded by the federal government and administered by the Walton County Housing Agency. As the public housing agency (PHA), Walton County enters into an Annual Contributions Contract with HUD to administer the program on HUD's behalf, ensuring compliance with federal laws and regulations.",
    goal: "Provide safe, affordable housing opportunities and manage resources efficiently to assist low-income families.",
    challenges: "Three positions administer a $3.1M federally funded voucher program serving about 300 families, with a 75% voucher-utilization target.",
    changeNote: "Vouchers Utilities decreasing by $25,000.",
    revenue: "Intergovernmental Revenues &mdash; Federal HUD Grant $3.1M",
    contracts: [
      { service: "Audit Services", provider: "Carr, Riggs, & Ingram", amount: 11500 }
    ],
    pms: [
      { q: "Total number of families served by HUD rental assistance programs per fiscal year", obj: "Administer HUD rental assistance programs effectively and maximize utilization of available vouchers", y: ["296", "298", "300", "300"], target: "300" },
      { q: "Percentage of available housing vouchers utilized per fiscal year", obj: "Administer HUD rental assistance programs effectively and maximize utilization of available vouchers", y: ["70%", "70%", "75%", "75%"], target: "75%" }
    ]
  },
  {
    name: "Human Resources", fte: 13, personnel: 1256383, operating: 109953, contractual: 29600, capital: 31000,
    deltaP: 43990, deltaO: 12953, deltaC: 0, video: null, fund: "General Fund",
    sof: "The Walton County Department of Human Resources provides centralized personnel services for all Walton County BCC departments — recruitment, selection, performance management, discipline policy, employee development, workers' compensation, and benefits for the BCC, all Constitutional offices, and retirees. The department also oversees countywide ADA compliance.",
    goal: "Attract, develop, and support a qualified workforce by delivering effective HR services and ensuring timely personnel actions.",
    challenges: "Thirteen positions serve Board departments and Constitutional Officers, planning 260 new-employee onboardings with Board turnover near 11%.",
    revenue: "Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $1,103,953 &middot; Miscellaneous Revenue &mdash; Indirect Administrative Fees $322,983",
    capitalItems: [
      { item: "SUV (Replacement)", amount: 31000 }
    ],
    contracts: [
      { service: "Employee Screening Services", provider: "AssureHire, Inc", amount: 29600 }
    ],
    pms: [
      { q: "Number of employees onboarded and trained per fiscal year", obj: "Provide onboarding and ongoing training for employees to ensure readiness and professional growth", y: ["210", "226", "231", "240"], target: "260" },
      { q: "Number of personnel action forms and benefits changes processed per fiscal year", obj: "Process personnel action forms and benefit changes promptly and efficiently", y: ["874 / 331", "961 / 437", "932 / 425", "900 / 450"], target: "900 / 450" }
    ]
  },
  {
    name: "Libraries", fte: 22.5, personnel: 1625655, operating: 320000, contractual: 60000, capital: 150000,
    deltaP: 272392, deltaO: 10300, deltaC: -22000, video: "gJ7QNzqj8ks", fund: "General Fund",
    sof: "The Public Library System supports free access to library services throughout Walton County with facilities in Flowersview, DeFuniak Springs, Freeport, and Santa Rosa Beach, plus a bookmobile serving schools and assisted living facilities. Libraries provide circulation, maker equipment, digital resources, Interlibrary Loan, and Career Online High School diploma programs for adult learners.",
    goal: "Deliver high-quality library services, resources, and programs that foster learning, literacy, and community engagement.",
    challenges: "Twenty-two and a half positions staff four library locations and a bookmobile, targeting 230,000 visitors and program attendees.",
    revenue: "Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $2.1M &middot; Charges for Services & Miscellaneous $21K",
    capitalItems: [{ item: "Books and library materials", amount: 150000 }],
    contracts: [
      { service: "Integrated Library System (ILS)", provider: "The Library Corporation", amount: 60000 }
    ],
    pms: [
      { q: "Total number of visitors and program attendees annually", obj: "Provide diverse on-site programs and outreach services to engage visitors of all ages", y: ["136,843", "143,477", "215,223", "220,000"], target: "230,000" },
      { q: "Number of new items added to the library collection (physical and digital) annually", obj: "Maintain and grow physical and digital collections to meet community needs", y: ["5,873", "6,467", "8,844", "7,000"], target: "7,000" }
    ]
  },
  {
    name: "Mosquito Control", fte: 8, ftePrior: 9, ftePositions: ["Lead Mosquito Control Technician"], personnel: 673438, operating: 398316, indirect: 264183, contractual: 0, capital: 91000,
    fteRollupNote: "Personnel Ledger: Environmental Services remains at 42 FTE because this reduction offsets Solid Waste's 1-FTE increase.",
    deltaP: -67045, deltaO: 168982, deltaC: -15000, video: "U5q2lymuFys", fund: "Mosquito Control Fund",
    sof: "The Mosquito Control Department is dedicated to protecting public health and enhancing quality of life for residents and visitors by managing mosquito populations through surveillance, larval control, and public education, aimed at minimizing nuisance and reducing the risk of mosquito-borne disease.",
    goal: "Protect public health and enhance quality of life by managing mosquito populations through effective, innovative, and environmentally responsible practices.",
    challenges: "Eight positions, down one, plan 610,000 treated acres and 9,750 site inspections, up from 580,000 and 9,600 in 2025.",
    changeNote: "Indirect Admin Allocation increasing by $146,557.",
    revenue: "General Government Taxes &mdash; Ad Valorem Taxes $1,426,937",
    capitalItems: [
      { item: "4x4 Cab Truck (New)", amount: 55000 },
      { item: "ULV Spray Unit (New) &times;2", amount: 36000 }
    ],
    contracts: [],
    pms: [
      { q: "Total number of acres treated per fiscal year", obj: "Implement targeted mosquito control interventions using science-based techniques", y: ["355,025", "473,516", "575,734", "580,000"], target: "610,000" },
      { q: "Number of site inspections performed per fiscal year", obj: "Conduct regular site inspections to identify and mitigate mosquito breeding grounds", y: ["4,936", "5,303", "8,289", "9,600"], target: "9,750" }
    ]
  },
  {
    name: "Mossy Head Wastewater Treatment Facility", fte: 1, personnel: 94800, operating: 219200, contractual: 150000, capital: 0,
    deltaP: 9940, deltaO: 7532, deltaC: -956000, video: null, fund: "Transportation Fund",
    sof: "The Mossy Head Wastewater Sewer System provides gravity and force main sewer service for the Northwest Commerce Industrial Park area. The department's objective is to ensure the manpower and resources necessary to operate and maintain the plant and collection system in a cost-effective manner within FDEP guidelines, while planning for future growth and expansion.",
    goal: "Operate and maintain the wastewater treatment facility and sewer system to ensure reliable service, regulatory compliance, and readiness for future growth.",
    challenges: "One County position and a contracted certified operator run the system serving the Northwest Commerce Industrial Park; infrastructure funding decreases $891,000.",
    changeNote: "Infrastructure decreasing by $891,000.",
    revenue: "Other Sources &mdash; Small County Surtax Transfer $379K &middot; Charges for Services &mdash; Sewer & Wastewater Fees $85K",
    contracts: [
      { service: "FDEP permit, design & CEI services (plant operation)", provider: "Not listed", amount: 100000 },
      { service: "Certified Wastewater Plant Operator", provider: "Paul E. Johnson", amount: 50000 }
    ],
    pms: [
      { q: "Number of lift station inspections or repairs completed per fiscal year", obj: "Perform regular inspections, maintenance, and repairs on lift stations to ensure proper functioning", y: ["30", "30", "30", "30"], target: "30" }
    ]
  },
  {
    name: "Office of Management and Budget", fte: 9, personnel: 1017276, operating: 57750, contractual: 0, capital: 0,
    deltaP: -24682, deltaO: -275000, deltaC: -150000, video: null, fund: "General Fund",
    sof: "The Office of Management and Budget (OMB) provides comprehensive financial and administrative support to the Board of County Commissioners, overseeing all authorized funds, preparing and monitoring the annual operating and capital budget, overseeing grant budgets and reporting, and maintaining the inventory of capital assets.",
    goal: "Maintain Walton County's financial stability and integrity through effective planning, compliance, transparency, and innovation in budget management.",
    services: [
      ["Build the annual budget", "Coordinates department requests, revenue estimates, balancing, and the final county budget."],
      ["Monitor public spending", "Tracks budget performance and supports amendments throughout the fiscal year."],
      ["Explain financial decisions", "Produces schedules, forecasts, analysis, and public budget information for decision-making."]
    ],
    achievement: { label: "GFOA Distinguished Budget Presentation Award", detail: "Walton County has received the Government Finance Officers Association's Distinguished Budget Presentation Award for FY2025 and FY2026, recognizing the County's budget document as a policy document, financial plan, operations guide, and communications device." },
    challenges: "Nine positions prepare the budget and manage grant spending, projected at $10M in FY2027 compared with $15.6M in 2025.",
    changeNote: "Books, Publications, Subscriptions or Memberships decreasing by $260,000.",
    revenue: "Miscellaneous Revenue &mdash; Indirect Administrative Fees $619,356 &middot; Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $440,670 &middot; Charges for Services &mdash; Cremation Fees $15,000",
    contracts: [],
    pms: [
      { q: "Percentage of budget prepared in compliance with Florida Statutes and Truth in Millage requirements", obj: "Prepare and present an annual budget in full compliance with Florida Statutes and Truth in Millage requirements", y: ["100%", "100%", "100%", "100%"], target: "100%", svc: 0 },
      { q: "Total amount of grant expenditures managed per fiscal year", obj: "Manage grant funding responsibly to maximize resources and support County programs", y: ["$14.3M", "$10.4M", "$16.7M", "$15.6M"], target: "$10M", svc: 1 }
    ]
  },
  {
    name: "Office of the County Attorney", fte: 9, ftePrior: 10, ftePositions: ["Paralegal"], personnel: 1052925, operating: 100000, contractual: 650000, capital: 0,
    deltaP: -188551, deltaO: -1999, deltaC: 0, video: null, fund: "General Fund",
    sof: "Under the direction of the County Attorney, the Office of the County Attorney provides legal services to the County across three primary areas: Contracts (drafting or reviewing all documents that legally bind the County), Litigation (representing the Board in all court cases involving the County), and Public Records (records management and support for public records requests).",
    goal: "Provide effective legal services, contract support, and public records management to ensure compliance, accountability, and transparency.",
    services: [
      ["Advise county government", "Provides legal counsel to the Board and Board-controlled departments."],
      ["Prepare and review legal documents", "Reviews ordinances, resolutions, agreements, contracts, and other county instruments."],
      ["Represent the county", "Manages litigation, claims, hearings, and other legal proceedings involving the county."]
    ],
    challenges: "Nine positions, after eliminating one paralegal, and $650,000 in contracted legal services handle about 400 contract reviews and all public-records requests.",
    revenue: "Intergovernmental Revenues &mdash; State Revenue Share $933K &middot; General Government Taxes &mdash; Ad Valorem $675K &middot; Miscellaneous Revenue $193K",
    contracts: [
      { service: "County Attorney Legal Services", provider: "Clay Adkinson", amount: 650000 }
    ],
    pms: [
      { q: "Number of contracts, agreements, and procurement documents reviewed per fiscal year", obj: "Review contracts, agreements, and procurement documents to ensure proper execution", y: ["380", "380", "380", "390"], target: "400", svc: 1 },
      { q: "Average response time for processing public records requests, measured in days", obj: "Respond to public records requests promptly and manage records effectively", y: ["5", "5", "5", "4.5"], target: "4.5" }
    ]
  },
  {
    name: "Planning", fte: 47, ftePrior: 45, ftePositions: ["Code Compliance Officer - STR", "Livability & Tourism Technician I"], personnel: 4961086, operating: 656025, contractual: 1222000, capital: 209000,
    deltaP: 347042, deltaO: -78017, deltaC: 0, video: "lKTWu2Q-6ug", fund: "General Fund",
    sof: "The Walton County Planning & Development Services Department serves as staff and provides professional land use planning advice to the Board of County Commissioners, implementing and updating the Comprehensive Plan and Land Development Code, concurrency and floodplain management, and development review. The Department also staffs the Planning Commission, Zoning Board of Adjustments, Design Review Board, and Affordable Housing Committee.",
    goal: "Provide timely, customer-focused planning and permitting services that promote sustainable growth, protect natural resources, and ensure compliance.",
    services: [
      ["Guide long-range growth", "Maintains planning policies that shape future land use and community development."],
      ["Review development proposals", "Evaluates applications for consistency with county plans and land-development requirements."],
      ["Support public land-use decisions", "Provides analysis, public-process support, and recommendations for planning decisions."]
    ],
    challenges: "Forty-seven positions, including two added for short-term rental compliance and livability, target 5,800 permits, up from 4,750 in 2025.",
    revenue: "Charges for Services &mdash; Planning & Short-Term Rental Fees $3.5M &middot; Intergovernmental Revenues $2.3M &middot; General Government Taxes $1.2M",
    capitalItems: [
      { item: "Short-Term Rental Building Improvements (New)", amount: 100000 },
      { item: "SUV (Replacement)", amount: 60000 },
      { item: "Short-Term Rental SUV (New)", amount: 49000 }
    ],
    contracts: [
      { service: "Land Development Code (LDC) Update", provider: "Not listed", amount: 282000 },
      { service: "South Walton Fire District STR Fire Code Compliance", provider: "South Walton Fire District", amount: 220000 },
      { service: "Call-Line 24/Service & Short-Term Rental Software", provider: "OpenGov, Inc; GovOS", amount: 460000 },
      { service: "Local Mitigation Strategy (LMS) Update", provider: "Not listed", amount: 150000 },
      { service: "Continuing Maintenance Services", provider: "Not listed", amount: 110000 }
    ],
    pms: [
      { q: "Percentage of development projects that meet MS4 permitting requirements", obj: "Ensure development projects meet MS4 permitting requirements to protect water quality", y: ["100%", "100%", "100%", "100%"], target: "100%", svc: 1 },
      { q: "Number of permits processed through the new EnerGov system", obj: "Improve efficiency and customer experience while meeting statutory review deadlines", y: ["3,973", "4,646", "4,782", "4,750"], target: "5,800", svc: 1 }
    ]
  },
  {
    name: "Probation", fte: 4, personnel: 329527, operating: 22050, contractual: 19000, capital: 0,
    deltaP: 5072, deltaO: 850, deltaC: 0, video: null, fund: "General Fund",
    sof: "The Probation Department supervises people sentenced to county probation, monitors compliance with court-ordered conditions, reports to the court, and connects probationers with required services.",
    goal: "Supervise probation cases and report compliance with court-ordered conditions.",
    challenges: "Four positions manage changing caseloads, court appearances, compliance reporting, referrals, and direct supervision of probationers.",
    revenue: "Charges for Services &mdash; Probation Fees $215K &middot; Intergovernmental Revenues $156K",
    contracts: [
      { service: "Spanish Interpretation Services", provider: "Maria O'Camo", amount: 7000 },
      { service: "Caseload Software", provider: "Tyler Technologies", amount: 12000 }
    ],
    pms: [
      { q: "Number of county court hearings attended by probation officers per calendar year", obj: "Monitor and attend all required county court hearings to support judicial processes", y: ["83", "83", "62", "56"], target: "60" }
    ]
  },
  {
    name: "Public Works", fte: 148, personnel: 13083100, operating: 7067900, contractual: 675000, capital: 7000000,
    deltaP: 38181, deltaO: -62853, deltaC: 2648200, video: "USzOdbzw-VI", fund: "Transportation Fund",
    sof: "The Public Works Department provides services related to infrastructure maintenance, repair, and construction that enhance quality of life for Walton County citizens and visitors, weighing every infrastructure improvement plan for the best long-term impact within available taxpayer funds.",
    goal: "Provide, maintain, and improve Walton County's public infrastructure in a sustainable, innovative, and efficient manner.",
    services: [
      ["Maintain roads and rights-of-way", "Repairs and maintains county roads, shoulders, signs, and related transportation assets."],
      ["Manage drainage and storm impacts", "Maintains drainage systems and responds to conditions affecting travel and property."],
      ["Deliver transportation improvements", "Coordinates paving, resurfacing, bridge, and other road improvement work."]
    ],
    challenges: "148 positions maintain 1,049 miles of road and target 23 completed capital projects, up from 17 in 2025.",
    changeNote: "Infrastructure increasing by $2,646,500.",
    revenue: "Other Sources &mdash; Small County Surtax Transfer & Balance Forward $19.5M &middot; Intergovernmental Revenues $3.4M &middot; General Government Taxes $2.4M &middot; Miscellaneous Revenue $2.5M",
    contracts: [
      { service: "Guardrail Services", provider: "Grading & Bush Hog Services, Inc", amount: 200000 },
      { service: "Thermo-striping Services", provider: "Emerald Coast Striping, LLC", amount: 200000 },
      { service: "Traffic Signal Services", provider: "Murdock Investments, LLC", amount: 125000 },
      { service: "Task Order Professional Services", provider: "Multiple providers as authorized", amount: 100000 },
      { service: "DeFuniak Springs Interlocal Road Maintenance", provider: "City of DeFuniak Springs", amount: 50000 },
    ],
    capitalItems: [
      { item: "21-Yard Dump Truck (New) &times;5 &mdash; Districts 1&ndash;5", amount: 1225000 },
      { item: "Mid-size Excavator (New) &times;2", amount: 318000 },
      { item: "3/4 Ton Crew Cab Truck w/Utility Body (Replacement) &times;3", amount: 195000 },
      { item: "Service Truck w/Lube Body (New)", amount: 195000 },
      { item: "Mid-size Excavator w/Mulching Head (New)", amount: 186000 },
      { item: "Flatbed Dump Truck (New)", amount: 165000 },
      { item: "1/2 Ton Pickup Crew Cab w/Fuel Transfer Tank (Replacement) &times;2", amount: 116000 },
      { item: "75-80 hp Tractor w/Loader, Grapple, Forks (New)", amount: 85000 },
      { item: "1,000 Gal Water Tank w/Pump & Chemical Rack (New)", amount: 14000 }
    ],
    capitalNote: "An additional $4.5M in Public Works capital is Local Option Fuel Tax-funded roadway work not itemized by department here; see the Transportation and Infrastructure Capital Ledger.",
    pms: [
      { q: "Number of capital improvement projects completed per fiscal year", obj: "Plan and complete capital improvement projects that enhance infrastructure sustainability", y: ["11", "10", "18", "17"], target: "23", svc: 2 },
      { q: "Number of miles of road maintained or improved per fiscal year (unpaved and paved roads)", obj: "Maintain and improve paved and unpaved roadways to enhance mobility and safety", y: ["1,046", "1,046", "1,046", "1,049"], target: "1,049", svc: 0 }
    ]
  },
  {
    name: "Purchasing", fte: 10, personnel: 888999, operating: 72500, contractual: 65000, capital: 50000,
    deltaP: 704, deltaO: -8000, deltaC: -105000, video: null, fund: "General Fund",
    sof: "The Purchasing Department ensures the effective and efficient management of purchasing activities in adherence to applicable federal, state, and local laws, statutes, and regulations, optimizing the value of every taxpayer dollar spent while also managing County Inventory.",
    goal: "Enhance efficiency, transparency, and effectiveness of procurement operations to support County departments and deliver value to the community.",
    services: [
      ["Run fair solicitations", "Coordinates competitive purchasing processes for county goods, services, and construction."],
      ["Support county purchasing", "Helps departments obtain needed resources under adopted rules and contracts."],
      ["Maintain procurement records", "Documents awards, contracts, vendor information, and purchasing compliance."]
    ],
    achievement: { label: "Achievement of Excellence in Procurement Award", detail: "Walton County Purchasing was named a 2026 winner of the National Procurement Institute's Achievement of Excellence in Procurement Award, recognizing innovation, professionalism, e-procurement, and ethics in public procurement." },
    challenges: "Ten positions process about 5,000 purchase orders a year and target 28 formal solicitations, up from 25 in 2025.",
    changeNote: "Books, Publications, Subscriptions or Memberships increasing by $64,000.",
    revenue: "Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $864,637 &middot; Miscellaneous Revenue &mdash; Indirect Administrative Fees $211,862",
    capitalItems: [
      { item: "Procurement Building Improvements (New)", amount: 50000 }
    ],
    contracts: [
      { service: "Purchasing Software", provider: "OpenGov", amount: 65000 }
    ],
    pms: [
      { q: "Total number of purchase orders processed per fiscal year", obj: "Streamline purchasing processes through technology and standardized procedures", y: ["4,389", "5,900", "4,596", "5,000"], target: "5,000", svc: 1 },
      { q: "Total number of formal solicitations per fiscal year", obj: "Ensure compliance and transparency in competitive procurement", y: ["18", "21", "30", "25"], target: "28", svc: 0 }
    ]
  },
  {
    name: "Recreation", fte: 6, personnel: 591658, operating: 211735, contractual: 0, capital: 30000,
    deltaP: 4949, deltaO: -865, deltaC: -30000, video: "ODzfUR4KX2o", fund: "General Fund",
    sof: "The Recreation Department operates youth and adult programs and maintains fields, courts, buildings, and equipment used for community recreation.",
    goal: "Provide diverse recreational programs that enhance community health, engagement, and quality of life.",
    challenges: "Six positions maintain facilities and schedules while the program target rises from 4,105 participants in 2025 to 4,500 in FY2027.",
    changeNote: "Machinery & Equipment decreasing by $30,000.",
    revenue: "Intergovernmental Revenues $653K &middot; Charges for Services &mdash; Program & Sports Fees $135K",
    capitalItems: [
      { item: "Recreation Building Improvements (New)", amount: 30000 }
    ],
    contracts: [],
    pms: [
      { q: "Total number of participants in recreational programs per fiscal year (soccer, basketball, kickball, etc.)", obj: "Develop, promote, and manage a variety of recreational programs that meet resident interests", y: ["3,378", "3,786", "3,891", "4,105"], target: "4,500" }
    ]
  },
  {
    name: "Soil Conservation", fte: 2, personnel: 148520, operating: 1480, contractual: 0, capital: 0,
    deltaP: 7315, deltaO: -645, deltaC: 0, video: null, fund: "General Fund",
    sof: "The Soil Conservation Office, in collaboration with the Natural Resources Conservation Service, provides technical assistance and financial incentives to help local farmers, ranchers, and foresters practice soil conservation, protect water resources, and create wildlife habitats, supporting the Choctawhatchee River Soil and Water Conservation District through USDA-NRCS cost-sharing programs.",
    goal: "Support sustainable land and water management practices by promoting soil conservation, protecting natural resources, and assisting landowners.",
    challenges: "Two positions support federal cost-share programs, targeting 80 EQIP and 20 CSP contracts covering about 25,500 acres.",
    revenue: "Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $150K",
    contracts: [],
    pms: [
      { q: "Number of EQIP contracts approved and total acreage managed under the program per fiscal year", obj: "Facilitate USDA conservation programs (EQIP and CSP) to help landowners implement conservation practices", y: ["66 / 14,768", "84 / 17,553", "80 / 13,918", "76 / 15,189"], target: "80 / 15,500" },
      { q: "Number of CSP contracts approved and total acreage managed under the program per fiscal year", obj: "Provide guidance, hydrologic data, and mapping resources to support conservation planning", y: ["4 / 1,782", "8 / 2,183", "18 / 9,782", "19 / 9,987"], target: "20 / 10,000" }
    ]
  },
  {
    name: "Solid Waste", fte: 28, ftePrior: 27, ftePositions: ["Solid Waste Scale Operator"], personnel: 2377275, operating: 1055100, indirect: 697192, contractual: 17200000, capital: 1790000,
    fteRollupNote: "Personnel Ledger: Environmental Services remains at 42 FTE because this increase offsets Mosquito Control's 1-FTE reduction.",
    deltaP: 42984, deltaO: -174090, deltaC: 1140000, video: "iz8DOXLQ8yU", fund: "Solid Waste Fund",
    sof: "Walton County Solid Waste manages the Franchise Agreement with Waste Management Inc. for municipal waste collection and disposal, and oversees daily operations of the Walton County Central Landfill — a Class I Transfer Station, Class III Landfills, recycling facilities, a yard waste facility, a waste tire collection center, and a groundwater monitoring system, all permitted by FDEP.",
    goal: "Ensure regulatory compliance, operational efficiency, and protection of natural resources across all waste streams.",
    challenges: "Twenty-eight positions, including a new scale operator, oversee the $17M collection franchise and plan for 97,376 tons of Class I waste.",
    changeNote: "Machinery & Equipment increasing by $1,140,000.",
    revenue: "General Government Taxes &mdash; Discretionary Sales Surtax $40.0M &middot; Charges for Services &mdash; Landfill Fees $560K",
    contracts: [
      { service: "Waste Collection and Disposal Franchise Services", provider: "Waste Management Inc of Florida", amount: 17000000 },
      { service: "Iron Remediation System Remedial Action Plan Modifications", provider: "Not listed", amount: 100000 },
      { service: "Annual Compliance Monitoring Services", provider: "Not listed", amount: 100000 }
    ],
    capitalItems: [
      { item: "Compactor (New)", amount: 1150000 },
      { item: "10,000 lb Lull & Attachments (New)", amount: 200000 },
      { item: "Service Truck & Tools (New)", amount: 200000 },
      { item: "Pickup Truck 4x4 (New) &times;2", amount: 125000 },
      { item: "Mini-Skid Steer & Attachments (New)", amount: 60000 },
      { item: "Roll-off Dumpsters (New)", amount: 40000 },
      { item: "Gate Arm for Transfer Station (New)", amount: 15000 }
    ],
    pms: [
      { q: "Total tons of Class I waste processed per year", obj: "Safely and efficiently process Class I waste in compliance with all applicable regulations", y: ["93,752", "94,525", "94,732", "96,147"], target: "97,376" },
      { q: "Total tons of recyclable material processed per year", obj: "Maximize diversion of recyclable materials from landfill through effective collection and processing", y: ["1,517", "1,412", "1,267", "1,137"], target: "1,150" }
    ]
  },
  {
    name: "Veteran Services", fte: 3, ftePrior: 2, ftePositions: ["Administrative Assistant"], personnel: 298724, operating: 17926, contractual: 0, capital: 0,
    fteRollupNote: "Personnel Ledger: County Administration Offices remains at 76 FTE because this increase offsets County Administration's 1-FTE reduction.",
    deltaP: 80324, deltaO: 226, deltaC: 0, video: "v4tpooBZoPs", fund: "General Fund",
    sof: "The Veteran Services Department works to communicate with every veteran and their dependents in Walton County, to administer and advocate for all the benefits they have earned, providing excellent customer service in a manner that depicts the gratitude and honor reserved for those who have sacrificed so much.",
    goal: "Deliver timely, effective, and informative assistance to veterans and their families.",
    challenges: "Three positions, up one, target 1,100 benefit claims and five outreach events, up from 1,050 claims and three events in 2025.",
    revenue: "Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $317K",
    contracts: [],
    pms: [
      { q: "Number of claims processed for veterans per fiscal year", obj: "Process ≥ 1,000 claims per fiscal year", y: ["752", "1,023", "1,074", "1,050"], target: "1,100" },
      { q: "Number of outreach presentations or events held for veterans", obj: "Conduct ≥ 3 outreach presentations or events for veterans each fiscal year", y: ["3", "2", "3", "3"], target: "5" }
    ]
  },
  {
    name: "Tourism Administration", entityType: "Tourism Administration Office", fte: 4, personnel: 631415, operating: 1554500, indirect: 1054085, contractual: 0, capital: 50000,
    deltaP: 291333, deltaO: 0, deltaC: 0, video: null, fund: "Tourist Development Fund",
    sof: "Tourism Administration provides executive leadership, financial stewardship, strategic coordination, and administrative support for Walton County Tourism. The office sustains the revenue base needed for visitor services and tourism-funded community investments while coordinating the work of marketing, communications, sales, visitor services, beach operations, and industry partners.",
    goal: "Steward visitor-funded resources and coordinate tourism programs that support a strong economy and community quality of life.",
    services: [["Lead tourism strategy","Sets priorities and coordinates tourism programs and investments."],["Steward tourism resources","Oversees Tourist Development Tax-supported budgets, contracts, and compliance."],["Support partners and offices","Aligns staff, industry partners, and community stakeholders around a year-round destination strategy."]],
    challenges: "Four positions oversee the $59.0M Tourist Development Fund, whose uses are restricted by state law to tourism-related purposes.",
    changeNote: "Other Services increasing by $180,000.",
    revenue: "Tourist Development Tax on eligible short-term lodging stays",
    capitalItems: [{item:"SUV (Replacement)",amount:50000}],
    contracts: [],
    sideCards: [{ label: "Tourism Lifeguard Services and Beach Safety", amount: 3380779, detail: "South Walton Fire District &mdash; purchased-service agreement funding beach-safety and lifeguard coverage, tracked separately from Tourism Administration's operating budget above." }],
    pms: [{q:"Tourism-supported jobs in Walton County",obj:"Foster sustainable tourism that supports local jobs annually",y:["47,000","47,000","41,600","33,800"],target:"32,000",svc:0},{q:"Average Daily Rate for Walton County lodging",obj:"Position Walton County as a high-value destination",y:["$413","$413","$385","$352"],target:"$375",svc:1}]
  },
  {
    name: "Sales and Visitors Center", entityType: "Tourism Administration Office", fte: 9, personnel: 863987, operating: 821850, indirect: 126725, contractual: 137438, capital: 0,
    deltaP: 159277, deltaO: 0, deltaC: 0, video: null, fund: "Tourist Development Fund",
    sof: "The Group Sales team generates new business opportunities and builds awareness of Walton County for meetings and conventions, incentives, weddings, and consumer travel. Visitor Center staff provide trusted destination information and help connect guests with local places, services, and experiences.",
    goal: "Generate qualified group business and provide accurate, welcoming visitor information that supports a positive Walton County experience.",
    services: [["Develop group business","Builds relationships with meeting, wedding, incentive, and travel planners."],["Operate visitor services","Provides in-person destination guidance, materials, and referrals."],["Represent the destination","Participates in sales missions, trade activity, and partner outreach."]],
    challenges: "Nine positions handle group sales for meetings, weddings, and travel, and staff the visitor center.", changeNote:"Promotional Activities increasing by $98,111.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays", contracts:[{service:"Advertising Services",provider:"Zehnder, Inc · Contract 24-27",amount:137438}], pms:[]
  },
  {
    name: "Communications", entityType: "Tourism Administration Office", fte: 5, personnel: 515869, operating: 262939, indirect: 57192, contractual: 114000, capital: 0,
    deltaP: 55555, deltaO: 0, deltaC: 0, video: null, fund: "Tourist Development Fund",
    sof: "The Communications Division supports Walton County Tourism through earned and owned media that inspire travel and inform visitors, residents, partners, and stakeholders. The division manages strategic communications, public relations, media activities, familiarization tours, press visits, industry relations, and community education about tourism's local value.",
    goal: "Build informed, credible relationships that strengthen destination awareness and understanding of tourism's role in Walton County.",
    services: [["Manage public relations","Coordinates media relations, press visits, releases, and destination storytelling."],["Inform partners and residents","Shares timely tourism information with community and industry stakeholders."],["Build owned content","Develops useful content across County tourism communication channels."]],
    challenges:"Five positions manage media relations, press visits, and tourism communications, supported by a $114,000 public relations contract.", changeNote:"Life & Health Insurance increasing by $19,589.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays", contracts:[{service:"Public Relations Services",provider:"Turner Public Relations, LLC · Contract 25-17",amount:114000}], pms:[]
  },
  {
    name: "Marketing", entityType: "Tourism Administration Office", fte: 4, personnel: 408142, operating: 1367234, indirect: 224827, contractual: 12502247, capital: 0,
    deltaP: 667858, deltaO: 0, deltaC: 0, video: null, fund: "Tourist Development Fund",
    sof: "The Marketing Division uses research, creative campaigns, digital channels, social media, and travel-trade coordination to communicate Walton County's destination experiences to priority audiences. This work supports visitor spending, local employment, and a diversified tourism economy.",
    goal:"Use research-led marketing to sustain high-value visitation and measurable economic benefit for Walton County.",
    services:[["Plan and place destination advertising","Develops integrated campaigns and media investments for priority markets."],["Manage digital visitor engagement","Operates web, social, email, customer-relationship, and digital-asset platforms."],["Measure market performance","Uses tourism research and analytics to guide audiences, timing, and investment."]],
    challenges:"Four positions manage $12.5M in contracted advertising, research, and digital marketing services.", changeNote:"Promotional Activities increasing by $611,612.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays",
    contracts:[{service:"Advertising Services",provider:"Zehnder, Inc · Contract 24-27",amount:11951147},{service:"Regional Tourism Communications Partnership",provider:"Florida's Coastal Northwest Communications Council",amount:265500},{service:"Tourism Analytics Platform",provider:"Key Data Dashboard, Inc",amount:84600},{service:"Public Relations",provider:"Turner Public Relations, LLC · Contract 25-17",amount:86000},{service:"Marketing Research",provider:"Not listed",amount:65000},{service:"Digital Asset Management",provider:"Not listed",amount:25000},{service:"Customer Relationship Management",provider:"Not listed",amount:25000}],
    sideCards: [{ label: "North Walton", amount: 355500, detail: "North Walton Tourist Development Tax District &mdash; restricted destination promotion program for areas north of Choctawhatchee Bay, tracked separately from Marketing's operating budget above." }],
    pms:[]
  },
  {
    name: "Beach Operations", entityType: "Beach Operations Office", fte: 67, ftePrior: 60, ftePositions: ["Beach Maintenance Landscape Technician (+2)", "Electrician Helper (+1)", "Beach Maintenance Specialist (+4)"], personnel: 4991699, operating: 3801809, indirect: 833992, contractual: 1470000, capital: 1902500,
    fteRollupNote: "Personnel Ledger: 127 FTE = Beach Operations 67 + Beach Tram 60.",
    deltaP: 2528302, deltaO: 0, deltaC: 0, video: null, fund: "Tourist Development Fund",
    sof:"Beach Operations maintains the cleanliness, function, and accessibility of Walton County's coastal public spaces. Its work includes beach and bay access maintenance, regional access and parking facilities, multi-use trails, scenic corridors, landscaping, equipment, and related visitor infrastructure.",
    goal:"Maintain clean, safe, reliable, and accessible beach and bay facilities for residents and visitors.",
    services:[["Maintain beach and bay facilities","Cleans, repairs, and supports public access facilities throughout the visitor season."],["Care for scenic corridors","Maintains landscaping and public-facing infrastructure along major tourism corridors."],["Deliver access improvements","Coordinates equipment and capital work that improves safety, function, and accessibility."]],
    serviceChange:"Adds staffing and capital capacity to support growing maintenance demands and expanded public infrastructure.",
    challenges:"Sixty-seven positions, up seven, clean 66 beach and bay access facilities daily in peak season and complete about 6,000 work orders.", changeNote:"Other Services increasing by $704,875.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays",
    capitalItems:[{item:"Beach Operations vehicles, machinery and equipment",amount:1902500}],
    contracts:[{service:"SR 83 (US 331) Landscaping Improvements",provider:"C&A Landscape Maintenance, LLC · Contract 25-26",amount:515000},{service:"US Highway 331 Median & Right-of-Way Maintenance",provider:"Harper Landscaping, LLC · Contract 22-028",amount:455000},{service:"Highway 98 Median & Right-of-Way Maintenance",provider:"ZIIC Outdoors, LLC · Contract 020-016",amount:300000},{service:"Task Order Services",provider:"Multiple providers as authorized",amount:200000}],
    sideCards: [{ label: "Beach Renourishment", amount: 11000000, detail: "$10,750,000 capital program plus $250,000 in task-order services to preserve and restore Walton County's 26 miles of beach, tracked separately from Beach Operations' totals above." }],
    pms:[{q:"Beach and bay public access facilities cleaned daily",obj:"Clean all beach and bay public access facilities daily during peak season",y:["60","60","62","63"],target:"66",svc:0},{q:"Maintenance work orders completed",obj:"Complete at least 6,000 maintenance work orders annually",y:["4,177","5,111","5,970","6,000"],target:"6,000",svc:2}]
  },
  {
    name:"Beach Tram", entityType:"Beach Operations Office", fte:60, ftePrior:54, ftePositions:["Beach Tram Driver (+4)", "Transportation Assistant Crew Leader (+2)"], personnel:3813305, operating:744750, indirect:177166, contractual:0, capital:507000,
    fteRollupNote:"Personnel Ledger: 127 FTE = Beach Operations 67 + Beach Tram 60.",
    deltaP:1726095, deltaO:0, deltaC:0, video:null, fund:"Tourist Development Fund",
    sof:"The Beach Tram Program provides free shuttle service between designated parking locations and key beach access points. The service improves access to popular beach areas, reduces parking demand and congestion, and supports a more convenient and sustainable visitor experience.",
    goal:"Provide safe, reliable, and convenient beach transportation that improves access and reduces vehicle pressure in high-demand areas.",
    services:[["Operate beach shuttles","Transports passengers between designated parking and beach access locations."],["Maintain fleet readiness","Coordinates drivers, mechanics, dispatch, inspections, and vehicle availability."],["Improve coastal mobility","Reduces parking demand and expands access for residents and visitors."]],
    serviceChange:"Expands driver and crew capacity and provides capital funding to support a higher FY2027 ridership target.",
    challenges:"Sixty positions, up six drivers and crew leaders, support a target of 250,000 riders, up from 200,000 in 2025.", changeNote:"Regular Salaries & Wages increasing by $601,594.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays", capitalItems:[{item:"Beach Tram vehicles and transportation equipment",amount:507000}], contracts:[],
    pms:[{q:"Passengers transported annually by the shuttle service",obj:"Transport at least 200,000 passengers annually",y:["77,282","193,725","168,203","200,000"],target:"250,000",svc:0}]
  }
];

function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
function pct(delta, base) { return base === 0 ? "N/A" : (delta >= 0 ? "+" : "") + ((delta / base) * 100).toFixed(1) + "%"; }

// States the FY2027 service-level decision. Offices with an explicit
// serviceChange (Beach Operations, Beach Tram) say what expands; every
// other office maintains current services under the Board's FY2027
// direction, with the staffing change named so the line carries
// information rather than repeating the side panel's primary change.
function serviceChangeFor(d) {
  if (d.serviceChange) return d.serviceChange;
  const delta = d.ftePrior != null ? d.fte - d.ftePrior : 0;
  const positions = d.ftePositions && d.ftePositions.length ? ` (${d.ftePositions.join("; ")})` : "";
  const staffing = delta > 0
    ? `staffing increases by ${delta} FTE${positions} to ${d.fte}`
    : delta < 0
      ? `staffing decreases by ${Math.abs(delta)} FTE${positions} to ${d.fte}`
      : `staffing holds at ${d.fte} FTE`;
  return `Current services continue at FY2026 levels with no service added or discontinued; ${staffing}.`;
}

const PRIMARY_SERVICE_TITLES = new Map([
  ["Eagle Springs Golf and Recreation Center", "Operate golf and recreation facilities"],
  ["Eagle Springs Grill", "Operate dining and event services"],
  ["Environmental Resources", "Protect and restore natural resources"],
  ["Extension Office", "Deliver research-based community education"],
  ["Geographic Info Systems", "Maintain countywide geographic information"],
  ["Housing & Urban Development", "Administer housing assistance"],
  ["Human Resources", "Support the County workforce"],
  ["Libraries", "Deliver library services and programs"],
  ["Mosquito Control", "Monitor and control mosquito populations"],
  ["Mossy Head Wastewater Treatment Facility", "Operate wastewater treatment and collection"],
  ["Probation", "Supervise court-ordered probation"],
  ["Recreation", "Deliver recreation programs and maintain facilities"],
  ["Soil Conservation", "Provide conservation assistance"],
  ["Solid Waste", "Manage waste collection and disposal"],
  ["Veteran Services", "Connect veterans with benefits and services"]
]);

const PRIMARY_SERVICE_DESCRIPTIONS = new Map([
  ["Eagle Springs Golf and Recreation Center", "Operates the golf course, pool, courts, walking path, pro shop, and related recreation facilities."],
  ["Eagle Springs Grill", "Provides food and beverage service for daily patrons, tournaments, and scheduled private events."],
  ["Environmental Resources", "Conducts inspections, water-quality work, habitat restoration, and environmental compliance projects."],
  ["Extension Office", "Provides research-based education and assistance in agriculture, families, youth development, and natural resources."],
  ["Geographic Info Systems", "Maintains spatial data, mapping systems, and geographic information used by County departments and the public."],
  ["Housing & Urban Development", "Administers housing assistance, eligibility, landlord coordination, and federal program compliance."],
  ["Human Resources", "Manages recruitment, benefits, employee records, classification, training, and workplace policies."],
  ["Libraries", "Operates library locations, collections, technology access, reference help, and public programs."],
  ["Mosquito Control", "Uses surveillance, treatment, source reduction, and public education to manage mosquito populations."],
  ["Mossy Head Wastewater Treatment Facility", "Operates and maintains wastewater collection and treatment systems under permit requirements."],
  ["Probation", "Supervises county probation cases, monitors court conditions, reports compliance, and makes service referrals."],
  ["Recreation", "Operates recreation programs and maintains the fields, courts, buildings, schedules, and equipment they require."],
  ["Soil Conservation", "Provides landowners with technical assistance for erosion, water quality, and conservation practices."],
  ["Solid Waste", "Operates disposal facilities and coordinates collection, transfer, recycling, and regulatory compliance."],
  ["Veteran Services", "Helps veterans and families prepare benefit claims and connect with federal, state, and local assistance."]
]);


// Splits a department's Revenue Summary text (d.revenue, e.g. "General
// Government Taxes &mdash; Ad Valorem Taxes $1.8M &middot; Miscellaneous
// Revenue &mdash; Indirect Administrative Fees $413K") into its
// top-level, middot-separated line items, each with the dollar amount
// at its end. Used to attribute a real dollar figure to each Who Funds
// row instead of leaving the payer narrative unquantified.
function parseRevenueGroups(html) {
  return String(html || "").split(/\s*&middot;\s*/).map((seg) => {
    const m = seg.match(/\$([\d,.]+)\s*(M|K)?\s*$/);
    if (!m) return null;
    let amount = parseFloat(m[1].replace(/,/g, ""));
    if (m[2] === "M") amount *= 1000000; else if (m[2] === "K") amount *= 1000;
    return { label: seg.replace(/&mdash;/g, "-"), amount };
  }).filter(Boolean);
}
function sumRevenue(html) {
  return parseRevenueGroups(html).reduce((s, g) => s + g.amount, 0);
}
function sumRevenueMatching(html, re) {
  return parseRevenueGroups(html).filter((g) => re.test(g.label)).reduce((s, g) => s + g.amount, 0);
}
function sumRevenueExcluding(html, includeRe, excludeRe) {
  return parseRevenueGroups(html).filter((g) => includeRe.test(g.label) && !excludeRe.test(g.label)).reduce((s, g) => s + g.amount, 0);
}

// Splits a property-tax-funded amount into a residential and a
// commercial/other row using the same 87.9% / 12.1% real-property
// just-value shares the live site's Who Pays Ledger uses.
// Household equivalents (34,362 Walton County households, per U.S.
// Census Bureau statistics) match the same figure used by the live
// site's Who Pays Ledger, so a resident-facing dollar amount can be
// expressed as an annual/monthly household cost the same way there.
const HOUSEHOLDS = 34362;
function householdCost(amount) {
  const annual = amount / HOUSEHOLDS;
  const monthly = annual / 12;
  const fmt = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${fmt(annual)} per household annually (${fmt(monthly)} monthly)`;
}

function splitPropertyTax(amount, detail) {
  if (!amount) return [];
  const residential = amount * 0.879;
  const commercial = amount - residential;
  return [
    ["Residential property owners", residential, `${detail} Estimated at ${householdCost(residential)}, using residential property's 87.9% share of Walton County's taxable real-property value across 34,362 households &mdash; a planning proxy, not an individual household's tax bill.`],
    ["Commercial and other property owners", commercial, detail]
  ];
}
// Splits a sales-tax-funded amount into a non-resident and a resident
// row using the 68% / 32% visitor share of retail spending from the
// live site's Who Pays Ledger (Walton County Tourism's visitor study).
function splitSalesTax(amount, detail) {
  if (!amount) return [];
  const nonResident = amount * 0.68;
  const resident = amount - nonResident;
  return [
    ["Non-residents", nonResident, `${detail} Estimated using the County's tourism visitor study, which found visitors account for 68% of local retail spending.`],
    ["Residents", resident, `${detail} The remaining 32% resident share reflects the same visitor-spending study, equal to ${householdCost(resident)} across 34,362 households.`]
  ];
}

function whoPaysFor(d) {
  const n = d.name.toLowerCase();
  const total = sumRevenue(d.revenue);
  // Tourism offices are funded entirely by Tourist Development Tax, so the
  // office's own FY2027 total is the amount paid by overnight visitors.
  const officeTotal = d.personnel + d.contractual + d.operating + (d.indirect || 0) + d.capital + (d.other || 0);
  if (d.fund.includes("Tourist Development")) return [["Overnight visitors", total || officeTotal, "Tourist Development Tax is paid on eligible short-term lodging stays and supports authorized tourism uses."]];
  if (/tourism lifeguard/.test(n)) return [["Overnight visitors", total || null, "Tourist Development Tax supports the service agreement; it is collected on eligible short-term lodging stays."]];
  if (/building department/.test(n)) return [["Permit applicants, property owners, contractors and developers", total || null, "Building Fund resources originate primarily from permits and development-related service activity; prior resources may also be carried forward."]];
  if (/golf and recreation/.test(n)) {
    const fees = sumRevenueMatching(d.revenue, /charges for services/i);
    return [["Golfers, members and facility users", fees || null, "Memberships, green fees, cart fees, pool entry and other customer charges support the facility."], ["Residents and visitors", (total - fees) || null, "Intergovernmental or General Fund support covers the portion not recovered from users."]];
  }
  if (/eagle springs grill/.test(n)) {
    const fees = sumRevenueMatching(d.revenue, /charges for services/i);
    return [["Customers and event patrons", fees || null, "Food, beverage and event purchases support Grill operations."], ["County support", (total - fees) || null, "Any remaining cost is supported through the applicable County fund."]];
  }
  if (/housing/.test(n)) return [["Federal taxpayers", total || null, "Federal housing-assistance resources support eligible households and program administration."]];
  if (/engineering|public works/.test(n)) {
    const fuel = sumRevenueMatching(d.revenue, /fuel tax/i);
    const surtax = sumRevenueExcluding(d.revenue, /surtax/i, /fuel tax/i);
    const taxes = sumRevenueExcluding(d.revenue, /general government taxes/i, /fuel tax/i);
    const other = total - fuel - surtax - taxes;
    return [
      ...(fuel ? [["Residents and non-residents purchasing fuel", fuel, "Local-option and other fuel taxes support transportation services."]] : []),
      ...splitSalesTax(surtax, "The Small County Surtax Transfer, a sales-tax-funded interfund transfer, supports transportation services."),
      ...splitPropertyTax(taxes, "General Fund or property-tax support may fund eligible projects and operations."),
      ...(other ? [["Intergovernmental and other sources", other, "Shared revenues and other resources support eligible projects and operations."]] : [])
    ];
  }
  if (/solid waste/.test(n)) {
    const surtax = sumRevenueMatching(d.revenue, /sales surtax/i);
    const fees = sumRevenueMatching(d.revenue, /charges for services|special assessment/i);
    const other = total - surtax - fees;
    return [
      ...splitSalesTax(surtax, "Discretionary Sales Surtax supports Solid Waste Fund collection and disposal services."),
      ["Solid-waste customers and property owners", fees || null, "Service charges and assessments support collection and disposal services."],
      ...(other ? [["County funds receiving or providing support", other, "Transfers and indirect administrative allocations retain the payer mix of the originating fund."]] : [])
    ];
  }
  if (/mosquito/.test(n)) {
    const dedicated = sumRevenueMatching(d.revenue, /1\/2 cent|sales tax|assessment|ad valorem/i);
    const other = total - dedicated;
    return [
      ...splitPropertyTax(dedicated, "Dedicated assessments and property-tax resources support mosquito-control services."),
      ...(other ? [["County funds", other, "Indirect administrative allocations reimburse shared County support where budgeted."]] : [])
    ];
  }
  if (/planning|code compliance/.test(n)) {
    const fees = sumRevenueMatching(d.revenue, /charges for services|permits|fees|fines|special assessment/i) - sumRevenueMatching(d.revenue, /tourist development tax/i);
    const taxes = sumRevenueMatching(d.revenue, /general government taxes|ad valorem/i);
    const tdt = sumRevenueMatching(d.revenue, /tourist development tax/i);
    return [
      ["Applicants, property owners, businesses and regulated users", fees || null, "Permits, certificates, service charges and fines are paid when the related activity or service occurs."],
      ...(tdt ? [["Overnight visitors", tdt, "Tourist Development Tax reimbursement for eligible tourism-related public-safety enforcement, collected on eligible short-term lodging stays."]] : []),
      ...splitPropertyTax(taxes, "General Fund or property-tax support covers services not recovered through fees.")
    ];
  }
  if (/librar|recreation/.test(n)) {
    const taxes = sumRevenueMatching(d.revenue, /general government taxes|ad valorem/i);
    const salesTax = sumRevenueMatching(d.revenue, /1\/2 cent|sales tax|sales surtax/i);
    const fees = sumRevenueMatching(d.revenue, /charges for services|fees/i);
    const other = total - taxes - salesTax - fees;
    return [
      ...splitPropertyTax(taxes, "General Fund support provides broad public access."),
      ...splitSalesTax(salesTax, "Local sales-tax revenue supports the General Fund."),
      ["Program and facility users", fees || null, "Applicable rentals, program fees or service charges are paid only by participating users."],
      ...(other ? [["Residents, visitors and businesses", other, "State shared revenues and other General Fund resources."]] : [])
    ];
  }
  if (/indirect administrative fees/i.test(d.revenue)) {
    const indirect = sumRevenueMatching(d.revenue, /indirect administrative fees/i);
    const taxes = sumRevenueMatching(d.revenue, /general government taxes|ad valorem/i);
    const salesTax = sumRevenueMatching(d.revenue, /1\/2 cent|sales tax|sales surtax/i);
    const fees = sumRevenueExcluding(d.revenue, /charges for services|fees/i, /indirect administrative fees/i);
    const other = total - indirect - taxes - salesTax - fees;
    return [
      ...splitPropertyTax(taxes, "Property taxes support the General Fund."),
      ...splitSalesTax(salesTax, "Local sales-tax revenue supports the General Fund."),
      ...(fees ? [["Service users", fees, "Paid by the residents, businesses, applicants, customers, or other users receiving the specific fee-supported service."]] : []),
      ["Administrative cost allocation", indirect || null, "Reimburse the General Fund for administrative support."],
      ...(other ? [["Residents, visitors and businesses", other, "State shared revenues and other General Fund resources."]] : [])
    ];
  }
  if (d.fund === "General Fund") {
    const taxes = sumRevenueMatching(d.revenue, /general government taxes|ad valorem/i);
    const salesTax = sumRevenueMatching(d.revenue, /1\/2 cent|sales tax|sales surtax/i);
    const other = total - taxes - salesTax;
    return [
      ...splitPropertyTax(taxes, "Property taxes support the General Fund."),
      ...splitSalesTax(salesTax, "Local sales-tax revenue supports the General Fund."),
      ...(other ? [["Residents, visitors and businesses", other, "State shared revenues, fees, and other General Fund resources."]] : [])
    ];
  }
  return [["Users and beneficiaries of the dedicated fund", total || null, "Fees, restricted taxes, grants or prior fund resources support eligible services."], ["State, federal or other County funding sources", null, "Shared revenues and transfers retain the payer mix of their originating source."]];
}

function compactFundingDetail(text) {
  return String(text)
    .replace(/\s+Estimated at[\s\S]*$/, "")
    .replace(/\s+Estimated using[\s\S]*$/, "")
    .replace(/\s+The remaining 32%[\s\S]*$/, "");
}
function householdEquivalent(text) {
  const match = String(text).match(/(\$[\d,.]+ per household annually \(\$[\d,.]+ monthly\))/);
  return match ? match[1] : "";
}

const sharedCss = `
  @page{ size:letter portrait; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:Arial, Helvetica, sans-serif; color:#173229; }
  section{
    position:relative;
    width:8.5in;
    height:11in;
    padding:.46in .6in .46in;
    background:#ffffff;
    overflow:hidden;
  }
  header{
    display:flex;
    justify-content:space-between;
    padding-bottom:7px;
    border-bottom:1px solid #63736b;
    color:#53665d;
    font-size:7.4pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
  }
  header em{ font-style:normal; }
  .kicker{
    display:block;
    margin-top:.16in;
    color:#b89521;
    font-size:7.4pt;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  h1{
    margin:5px 0 .13in;
    color:#003f28;
    font:800 18pt/1.05 Georgia, "Times New Roman", serif;
    letter-spacing:-.02em;
    padding-bottom:.1in;
    border-bottom:2px solid #d1be78;
  }
  .top-grid{
    display:grid;
    grid-template-columns:1fr 1.9in;
    gap:.28in;
    align-items:start;
    margin-bottom:.16in;
  }
  h2{
    margin:0 0 .05in;
    color:#003f28;
    font:800 7.9pt Georgia, serif;
    text-transform:uppercase;
    letter-spacing:.03em;
  }
  p.sof{
    margin:0 0 .1in;
    color:#33453c;
    font-size:7.9pt;
    line-height:1.4;
  }
  .responsibility-tags{ display:flex; flex-wrap:wrap; gap:.04in; margin:.055in 0 0; }
  .responsibility-tags span{ padding:.025in .065in; border-radius:99px; background:#edf3ef; color:#315245; font-size:5.6pt; font-weight:800; }
  .editorial-cards{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:.12in;
    margin:.1in 0 0;
  }
  .goal-quote{
    margin:0;
    min-height:.76in;
    padding:.1in .12in .11in;
    border:1px solid #e3d28f;
    border-radius:8px;
    background:#fbf7e8;
  }
  .goal-quote span{
    display:block;
    margin-bottom:.025in;
    color:#b89521;
    font-size:6pt;
    font-weight:800;
    text-transform:uppercase;
    letter-spacing:.05em;
  }
  .goal-quote p{
    margin:0;
    color:#173229;
    font:700 8pt/1.35 Georgia, serif;
  }
  .goal-quote.mid{
    border-color:#d7e2dc;
    background:#f2f6f3;
  }
  .goal-quote.mid p{
    color:#33453c;
    font:400 7.8pt/1.4 Arial, Helvetica, sans-serif;
  }
  .achv-line{
    display:flex;
    align-items:baseline;
    gap:.07in;
    margin:.07in 0 0;
    color:#33453c;
    font-size:6.9pt;
    line-height:1.4;
  }
  .achv-line .achv-star{ flex:0 0 auto; color:#b89521; font-size:8pt; line-height:1.4; }
  .achv-line b{ color:#003f28; font-weight:800; }
  .svc-change-note{ margin:.04in 0 .065in; padding:.045in .07in; border-left:3px solid #d1be78; background:#fbfaf5; color:#52665c; font-size:6.35pt; line-height:1.32; }
  .svc-change-note b{ color:#a88418; font-size:5.5pt; letter-spacing:.04em; text-transform:uppercase; }
  .svc-measure-list{ padding-top:.05in; border-top:1px solid #eef2ef; }
  .svc-block{ display:grid; grid-template-columns:1.7in minmax(0,1fr); gap:.2in; align-items:start; padding:.07in 0; border-bottom:1px solid #e4ebe7; }
  .svc-block:last-child{ border-bottom:0; }
  .svc-block .svc-head{ padding-right:.04in; }
  .svc-block .svc-head b{ display:block; color:#003f28; font:800 8pt/1.2 Georgia, serif; }
  .svc-block .svc-head span{ display:block; margin-top:.035in; color:#52665c; font-size:6.5pt; line-height:1.35; }
  .svc-block.leftover .svc-head b{ color:#68786f; font:800 6.4pt Arial, Helvetica, sans-serif; text-transform:uppercase; letter-spacing:.03em; }
  .svc-block.leftover .svc-head span{ font-style:italic; }
  .svc-kpis{ display:flex; flex-direction:column; gap:.055in; }
  .svc-block .pm-item{ margin:0; padding:.065in .1in; border:1px solid #e0e8e3; border-radius:7px; background:#f8faf8; }
  .side-col{ display:flex; flex-direction:column; }
  .side-card{
    margin-top:.16in;
    background:#003f28;
    border-radius:11px;
    padding:.14in .16in;
    color:#fff;
  }
  .side-card.sub{ margin-top:.14in; padding:.11in .16in; }
  .side-sub-amt{ margin-top:.03in; color:#fff; font:800 13pt Georgia, serif; }
  .side-sub-detail{ margin:.05in 0 0; color:#a9c4b3; font-size:6.1pt; line-height:1.4; }
  .side-fund{ color:#e7c95f; font-size:6pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; margin-bottom:.06in; }
  .side-stats{ display:flex; flex-direction:column; gap:.04in; margin-bottom:.08in; }
  .side-stats div{ display:flex; justify-content:space-between; align-items:baseline; gap:.08in; }
  .side-stats div b{ font:800 9pt Georgia, serif; white-space:nowrap; }
  .side-stats div.primary b{ font-size:14pt; color:#fff; }
  .side-stats div.prior b{ color:#c5d7cd; }
  .side-stats div span{ color:#a9c4b3; font-size:5.5pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
  .side-change{ padding:.065in 0; border-top:1px solid rgba(255,255,255,.2); border-bottom:1px solid rgba(255,255,255,.2); margin-bottom:.08in; }
  .side-change-label{ display:block; margin-bottom:.025in; color:#a9c4b3; font-size:5.2pt; font-weight:800; text-transform:uppercase; letter-spacing:.05em; }
  .change-finance{ display:flex; justify-content:space-between; align-items:center; gap:.06in; }
  .change-finance b{ color:#8fe0b0; font-size:10.5pt; }
  .side-change.down .change-finance b{ color:#f0b090; }
  .change-finance em{ padding:.018in .045in; border:1px solid rgba(255,255,255,.22); border-radius:99px; color:#dce9e2; font-size:5.5pt; font-style:normal; font-weight:800; }
  .workforce-line{ display:grid; grid-template-columns:1fr auto; gap:.025in .08in; align-items:center; margin-top:.06in; padding-top:.055in; border-top:1px solid rgba(255,255,255,.14); }
  .workforce-line span{ color:#a9c4b3; font-size:5.2pt; font-weight:800; text-transform:uppercase; letter-spacing:.05em; }
  .workforce-line b{ color:#fff; font-size:7pt; }
  .workforce-line em{ grid-column:2; color:#a9c4b3; font-size:5.5pt; font-style:normal; text-align:right; }
  .workforce-position-note{ margin:.045in 0 0; padding-top:.045in; border-top:1px solid rgba(255,255,255,.1); color:#dce9e2; font-size:5.35pt; line-height:1.3; }
  .workforce-position-note b{ color:#d1be78; }
  .fte-change-note{ margin:-.05in 0 .08in; text-align:center; font-size:6pt; font-style:italic; line-height:1.3; }
  .fte-change-note.up{ color:#8fe0b0; }
  .fte-change-note.down{ color:#f0b090; }
  .side-split{ font-size:6.3pt; line-height:1.5; }
  .side-split div{ display:flex; justify-content:space-between; }
  .side-split div>span{ display:flex; align-items:center; gap:.045in; }
  .side-split div>span:before{ content:""; width:5px; height:5px; flex:0 0 5px; border-radius:50%; background:#ffffff; }
  .side-split .personnel>span:before{ background:#e7c95f; }
  .side-split .contractual>span:before{ background:#85bea0; }
  .side-split .operating>span:before,.side-split .indirect>span:before{ background:#ffffff; }
  .side-split .capital>span:before{ background:#c7d2cc; }
  .side-split b{ color:#e7c95f; }
  .budget-mix{ display:flex; height:7px; margin:.075in 0 .07in; overflow:hidden; border-radius:99px; background:rgba(255,255,255,.14); }
  .budget-mix i{ display:block; height:100%; }
  .budget-mix .personnel{ background:#e7c95f; }.budget-mix .contractual{ background:#85bea0; }.budget-mix .operating{ background:#ffffff; }.budget-mix .capital{ background:#c7d2cc; }
  .qr-wrap{ margin-top:.08in; padding-top:.08in; border-top:1px solid rgba(255,255,255,.2); text-align:center; }
  .qr-wrap img{ box-sizing:border-box; width:.8in; height:.8in; border:1px solid #d1be78; border-radius:0; background:#fff; }
  .qr-wrap span{ display:block; margin-top:.02in; color:#a9c4b3; font-size:5.3pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; }
  .rev-con-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.24in; margin:.06in 0 .1in; padding-top:.08in; border-top:1px solid #d7e2dc; }
  .rev-con-grid.three{ grid-template-columns:1.05fr 1fr 1fr; }
  .rev-box h2, .con-box h2, .cap-box h2{ padding-bottom:.04in; border-bottom:1px solid #003f28; margin-bottom:.05in; }
  .rev-box p{ margin:0; color:#33453c; font-size:7.1pt; line-height:1.42; }
  .payer-row{margin:0 0 .045in;padding:.06in .075in;border:1px solid #e1e9e4;border-radius:6px;background:#f8faf8;color:#33453c;font-size:6.2pt;line-height:1.28}.payer-row:nth-child(odd){background:#f2f6f3}.payer-row .payer-head{display:flex;justify-content:space-between;align-items:baseline;gap:.08in}.payer-row b{color:#003f28;font-size:6.6pt}.payer-row .payer-amt{flex:0 0 auto;color:#006231;font-size:7pt;font-weight:800;white-space:nowrap}.payer-detail{margin-top:.025in!important;font-size:5.9pt!important;line-height:1.28!important}.payer-equivalent{display:inline-block;margin-top:.035in;padding:.018in .05in;border-radius:99px;background:#e4f1e8;color:#006231;font-size:5.7pt;font-weight:900}.source-trace{margin:.055in 0 0;color:#68786f;font-size:5.55pt!important;line-height:1.3!important;font-style:italic}
  .con-list{ margin:0; }
  .con-row{ display:flex; justify-content:space-between; gap:.08in; padding:.04in .055in; border-bottom:1px solid #edf1ee; font-size:6.6pt; }
  .con-row:nth-child(even){ background:#f4f7f5; }
  .con-row .con-name{ color:#173229; }
  .con-row .con-name em{ display:block; color:#68786f; font-style:normal; font-size:6.2pt; }
  .con-row b{ color:#003f28; white-space:nowrap; }
  .con-note{ margin:.04in 0 0; color:#68786f; font-size:6.3pt; font-style:italic; line-height:1.35; }
  .con-empty{ color:#68786f; font-size:7pt; font-style:italic; }
  .empty-card{ padding:.075in .085in; border:1px solid #e1e9e4; border-radius:6px; background:#f4f7f5; color:#52665c; font-size:6.35pt; line-height:1.3; }
  .empty-card b{ display:block; margin-bottom:.02in; color:#003f28; font-size:6.6pt; }
  .cap-row{ display:flex; justify-content:space-between; gap:.06in; padding:.04in .055in; border-bottom:1px solid #edf1ee; font-size:6.35pt; line-height:1.25; }
  .cap-row:nth-child(even){ background:#f4f7f5; }
  .cap-row.notfunded{ color:#a24b1e; }
  .cap-row span{ color:#173229; }
  .cap-row.notfunded span{ color:#a24b1e; font-style:italic; }
  .cap-row b{ color:#003f28; white-space:nowrap; }
  .cap-row.notfunded b{ color:#a24b1e; }
  .cap-more{ margin:.03in 0 0; color:#68786f; font-size:6.2pt; font-style:italic; }
  .cap-note{ margin:.04in 0 0; color:#68786f; font-size:6.1pt; font-style:italic; line-height:1.32; }
  .goal-chain{ margin-top:.1in; margin-bottom:.14in; }
  .goal-chain-inline{ margin-top:.14in; margin-bottom:0; }
  .pm-item{ padding:.06in 0; border-bottom:1px solid #eef2ef; }
  .pm-item:last-child{ border-bottom:0; }
  .pm-item .pm-q{ margin:0 0 .045in; color:#003f28; font-size:7.4pt; font-weight:800; line-height:1.25; }
  .pm-trend{ display:grid; grid-template-columns:repeat(4, minmax(0,1fr)) auto; align-items:baseline; gap:.1in .3in; }
  .pm-trend span{ color:#8b988f; font-size:5.6pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
  .pm-trend span b{ display:block; margin-bottom:.015in; color:#173229; font:800 9.5pt Georgia, serif; font-variant-numeric:tabular-nums; }
  .pm-trend span.target{ padding-left:.22in; border-left:1px solid #e4ebe7; color:#0b7741; }
  .pm-trend span.target b{ color:#0b7741; }
  .pm-trend span b{ white-space:nowrap; }
  .pm-trend span b .pm-pair{ display:block; font-size:.85em; }
  .pm-trend.compact{ gap:.1in .12in; }
  .pm-trend.compact span b{ font-size:7.8pt; }
  .pm-trend.compact span.target{ padding-left:.12in; }
  .footnote{ margin-top:.1in; color:#68786f; font-size:6.4pt; line-height:1.35; font-style:italic; }
  footer{
    position:absolute;
    left:.6in;
    right:.6in;
    bottom:.26in;
    display:flex;
    justify-content:space-between;
    border-top:1px solid #cbd8d1;
    padding-top:6px;
    color:#68786f;
    font-size:7pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
  }

  /* section divider */
  .divider-photo{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .divider-frame{ position:absolute; inset:.3in; border:1px solid #577e6d; }
  .divider{ position:relative; z-index:1; display:flex; flex-direction:column; justify-content:flex-start; align-items:flex-start; height:100%; padding:3.45in .8in 0; }
  .divider .kicker2{ color:#b89521; font-size:11pt; font-weight:900; letter-spacing:.18em; text-transform:uppercase; margin-bottom:.15in; }
  .divider h1b{ color:#ffffff; font:800 46pt/1.05 Georgia, serif; margin:0 0 .3in; }
  .divider p{ color:#cfe0d7; font-size:11pt; line-height:1.6; max-width:5in; }

  /* overview / index */
  .index-list{ column-count:2; column-gap:.4in; }
  .index-row{ break-inside:avoid; display:flex; justify-content:space-between; gap:.1in; padding:.05in 0; border-bottom:1px solid #f1f4f1; font-size:7.8pt; }
  .index-row b{ color:#003f28; }
  .stat-strip{ display:grid; grid-template-columns:repeat(3,1fr); gap:.13in; margin:0 0 .22in; }
  .stat-card{ padding:.13in .1in; border-radius:10px; background:#003f28; text-align:center; }
  .stat-card b{ display:block; color:#fff; font:800 13pt/1.1 Georgia, serif; }
  .stat-card span{ display:block; margin-top:.03in; color:#e7c95f; font-size:6.2pt; font-weight:800; letter-spacing:.02em; text-transform:uppercase; line-height:1.25; }
`;

async function buildDeptPage(d, pageNumber) {
  const fy27 = d.personnel + d.contractual + d.operating + (d.indirect || 0) + d.capital + (d.other || 0);
  const deltaTotal = d.deltaP + d.deltaO + d.deltaC;
  const fy26 = fy27 - deltaTotal;
  const isDown = deltaTotal < 0;
  const dsign = deltaTotal >= 0 ? "+" : "−";
  const fteDelta = d.ftePrior != null ? d.fte - d.ftePrior : null;
  const workforceChange = fteDelta ? `${fteDelta > 0 ? "+" : "&minus;"}${Math.abs(fteDelta)} FTE` : "No change";
  const workforcePositionNote = fteDelta && d.ftePositions?.length
    ? `<p class="workforce-position-note"><b>${fteDelta > 0 ? "Added" : "Reduced"}:</b> ${d.ftePositions.join("; ")}</p>`
    : "";
  const ftePositionText = d.ftePositions && d.ftePositions.length ? ` (${d.ftePositions.join("; ")})` : "";
  const fteDeltaHtml = fteDelta ? `<p class="fte-change-note ${fteDelta > 0 ? "up" : "down"}">${fteDelta > 0 ? "+" : "&minus;"}${Math.abs(fteDelta)} FTE ${fteDelta > 0 ? "requested" : "reduced"}${ftePositionText} from FY2026 (${d.ftePrior} &rarr; ${d.fte})</p>` : "";
  // Rows without a dollar amount are omitted rather than printed unquantified.
  const payerRows = whoPaysFor(d).filter(([, amount]) => amount);
  const usesPropertyMethod = payerRows.some(([, , explanation]) => /87\.9%|34,362 households/.test(explanation));
  const usesSalesMethod = payerRows.some(([, , explanation]) => /tourism visitor study|68% of local retail spending|32% resident share/.test(explanation));
  const payerHtml = payerRows.map(([payer, amount, explanation]) => { const equivalent = householdEquivalent(explanation); return `<div class="payer-row"><div class="payer-head"><b>${payer}</b>${amount ? `<span class="payer-amt">${money(amount)}</span>` : ""}</div><p class="payer-detail">${compactFundingDetail(explanation)}</p>${equivalent ? `<span class="payer-equivalent">${equivalent}</span>` : ""}</div>`; }).join("");
  const payerMethodHtml = (usesPropertyMethod || usesSalesMethod)
    ? `<p class="source-trace">Planning estimates: ${usesPropertyMethod ? "property-tax shares use the Countywide 87.9% residential / 12.1% commercial taxable-value allocation" : ""}${usesPropertyMethod && usesSalesMethod ? "; " : ""}${usesSalesMethod ? "sales-tax shares use the tourism study's 68% visitor / 32% resident retail-spending allocation" : ""}.</p>`
    : "";

  let qrHtml = "";
  const pageHref = DEPARTMENT_PAGE_HREFS.get(d.name);
  if (pageHref) {
    const url = `https://final2027.budget-waltoncountyfl.com/pages/${pageHref}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 4, width: 200, color: { dark: "#003f28", light: "#ffffff" } });
    qrHtml = `<div class="qr-wrap"><img src="${dataUrl}" alt="QR"/><span>View Online</span></div>`;
  }

  // Long values (six-digit counts, "80 / 15,500" pairs) get a compact
  // size so the four actuals never run together or wrap mid-value; a
  // paired value stacks its second figure on its own line.
  const pmVal = (v) => {
    const parts = String(v).split(/\s*\/\s*/);
    return parts.length === 2 ? `${parts[0]}<small class="pm-pair">/ ${parts[1]}</small>` : v;
  };
  const pmBlock = (pm) => `
    <div class="pm-item">
      <p class="pm-q">${pm.q}</p>
      <div class="pm-trend${[...pm.y, pm.target].some((v) => String(v).split("/").pop().trim().length > 6) ? " compact" : ""}">
        <span><b>${pmVal(pm.y[0])}</b>2022</span>
        <span><b>${pmVal(pm.y[1])}</b>2023</span>
        <span><b>${pmVal(pm.y[2])}</b>2024</span>
        <span><b>${pmVal(pm.y[3])}</b>2025</span>
        <span class="target"><b>${pmVal(pm.target)}</b>FY27 Target</span>
      </div>
    </div>`;

  // Pairs each core service with the performance measure(s) that track it
  // (via each pm's optional svc index into d.services), so the page reads
  // goal -> service -> the measure proving it out, instead of two
  // disconnected lists. Departments without an explicit services array fall
  // back to a single "Primary service" entry, which every measure attaches
  // to since there's nothing to disambiguate. Measures with no svc match
  // (or that belong to a fallback-only department) are listed as
  // department-wide measures rather than forced onto the wrong service.
  const hasExplicitServices = !!d.services;
  const serviceList = d.services || [[PRIMARY_SERVICE_TITLES.get(d.name) || `Deliver ${d.name} services`, PRIMARY_SERVICE_DESCRIPTIONS.get(d.name) || `Carries out the responsibilities and tracks the activity measures shown for ${d.name}.`]];
  const responsibilityTags = serviceList.slice(0, 3).map(([title]) => `<span>${title}</span>`).join("");
  const matchedPms = new Set();
  const svcBlocks = serviceList.map(([t, desc], i) => {
    const linked = hasExplicitServices ? d.pms.filter((pm) => pm.svc === i) : d.pms;
    if (!linked.length) return null;
    linked.forEach((pm) => matchedPms.add(pm));
    return `<div class="svc-block"><div class="svc-head"><b>${t}</b><span>${desc}</span></div><div class="svc-kpis">${linked.map(pmBlock).join("")}</div></div>`;
  }).filter(Boolean).join("");
  const leftoverPms = hasExplicitServices ? d.pms.filter((pm) => !matchedPms.has(pm)) : [];
  const leftoverHtml = leftoverPms.length
    ? `<div class="svc-block leftover"><div class="svc-head"><b>Department-wide Measures</b><span>Measures that reflect the department&rsquo;s overall performance.</span></div><div class="svc-kpis">${leftoverPms.map(pmBlock).join("")}</div></div>`
    : "";

  const conHtml = d.contracts.length
    ? `<div class="con-list">${d.contracts.map((c) => `<div class="con-row"><div class="con-name">${c.service}${c.separate ? `<em>Tracked separately</em>` : ""}</div><b>${c.amountLabel || money(c.amount)}</b></div>`).join("")}</div>${d.contractsNote ? `<p class="con-note">${d.contractsNote}</p>` : ""}`
    : `<div class="empty-card"><b>No FY2027 contracted services</b>No separately identified contractual-service request is budgeted for this office.</div>`;

  const sideCardsHtml = (d.sideCards || []).map((s) => `
    <div class="side-card sub">
      <div class="side-fund">${s.label}</div>
      <div class="side-sub-amt">${money(s.amount)}</div>
      <p class="side-sub-detail">${s.detail}</p>
    </div>`).join("");

  const capItems = d.capitalItems || [];
  const MAX_CAP_ROWS = 12;
  let capHtml = "";
  if (capItems.length) {
    const sorted = [...capItems].sort((a, b) => b.amount - a.amount);
    const shown = sorted.slice(0, MAX_CAP_ROWS);
    const hidden = sorted.slice(MAX_CAP_ROWS);
    capHtml = shown.map((c) => `<div class="cap-row${c.notFunded ? " notfunded" : ""}"><span>${c.item}</span><b>${c.notFunded ? "(" + money(c.amount) + ")" : money(c.amount)}</b></div>`).join("");
    if (hidden.length) {
      const hiddenTotal = hidden.reduce((s, c) => s + c.amount, 0);
      capHtml += `<p class="cap-more">+${hidden.length} more item${hidden.length === 1 ? "" : "s"} &mdash; ${money(hiddenTotal)} total</p>`;
    }
    const fundedItemTotal = capItems.filter((c) => !c.notFunded).reduce((sum, c) => sum + c.amount, 0);
    const unitemizedBalance = d.capital - fundedItemTotal;
    if (unitemizedBalance > 0) capHtml += `<div class="cap-row"><span>Other capital budget not itemized on this page</span><b>${money(unitemizedBalance)}</b></div>`;
    if (d.capitalNote) capHtml += `<p class="cap-note">${d.capitalNote}</p>`;
  }

  const mixOperating = d.operating + (d.indirect || 0) + (d.other || 0);
  const mixSegments = [
    ["personnel", d.personnel], ["contractual", d.contractual], ["operating", mixOperating], ["capital", d.capital]
  ].filter(([, amount]) => amount > 0).map(([name, amount]) => `<i class="${name}" style="width:${((amount / fy27) * 100).toFixed(2)}%"></i>`).join("");

  return `
  <section class="profile-page">
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <div class="top-grid">
      <div>
        <small class="kicker">${d.entityType || "Departments"}</small>
        <h1>${d.name}</h1>
        <h2>Statement of Function</h2>
        <p class="sof">${d.sof}</p>
        <div class="responsibility-tags">${responsibilityTags}</div>
        ${d.achievement ? `<p class="achv-line"><span class="achv-star">&#9733;</span><span><b>${d.achievement.label}.</b> ${d.achievement.detail}</span></p>` : ""}
        ${(d.goal || d.challenges) ? `<div class="editorial-cards">${d.goal ? `<div class="goal-quote"><span>Department Goal</span><p>${d.goal}</p></div>` : ""}${d.challenges ? `<div class="goal-quote mid"><span>FY2027 Workload and Constraints</span><p>${d.challenges}</p></div>` : ""}</div>` : ""}
        <div class="goal-chain goal-chain-inline">
          <h2>Core Services &amp; Performance</h2>
          <p class="svc-change-note"><b>FY2027 Service Outlook</b><br>${serviceChangeFor(d)}</p>
          <div class="svc-measure-list">${svcBlocks}${leftoverHtml}</div>
          ${d.pms.length ? "" : `<p class="con-empty">${d.entityType === "Tourism Administration Office" ? "This office is part of the Tourism Administration department; its performance is measured and reported with the Tourism Administration department measures." : "Performance for this office is reported at the department level."}</p>`}
        </div>
      </div>
      <div class="side-col">
        <div class="side-card">
          <div class="side-fund">${d.fund}</div>
          <div class="side-stats">
            <div class="primary"><b>${money(fy27)}</b><span>FY2027 Total</span></div>
            <div class="prior"><b>${money(fy26)}</b><span>FY2026 Total</span></div>
          </div>
          <div class="side-change ${isDown ? "down" : "up"}">
            <span class="side-change-label">Budget Change</span>
            <div class="change-finance"><b>${deltaTotal === 0 ? "$0" : dsign + money(Math.abs(deltaTotal))}</b><em>${pct(deltaTotal, fy26)}</em></div>
            <div class="workforce-line"><span>Workforce</span><b>${d.fte} FTE</b><em>${workforceChange}</em></div>
            ${workforcePositionNote}
            ${d.fteRollupNote ? `<p style="margin:.055in 0 0;color:#dce9e1;font-size:5.5pt;line-height:1.3;">${d.fteRollupNote}</p>` : ""}
          </div>
          <div class="budget-mix" aria-label="Budget composition">${mixSegments}</div>
          <div class="side-split">
            <div class="personnel"><span>Personnel</span><b>${money(d.personnel)}</b></div>
            <div class="contractual"><span>Contractual</span><b>${money(d.contractual)}</b></div>
            <div class="operating"><span>Operating</span><b>${money(d.operating)}</b></div>
            ${(d.indirect || 0) ? `<div class="indirect"><span>Indirect</span><b>${money(d.indirect)}</b></div>` : ""}
            <div class="capital"><span>Capital</span><b>${money(d.capital)}</b></div>
          </div>
          ${d.changeNote ? `<p style="margin:.06in 0 0;color:#a9c4b3;font-size:6pt;line-height:1.35;">Primary change: ${d.changeNote}</p>` : ""}
          ${qrHtml}
        </div>
        ${sideCardsHtml}
      </div>
    </div>
    <div class="rev-con-grid three">
      <div class="rev-box"><h2>Who Funds</h2>${payerHtml}${payerMethodHtml}</div>
      <div class="con-box"><h2>Contracts</h2>${conHtml}</div>
      <div class="cap-box"><h2>Capital Requests</h2>${capItems.length ? capHtml : (d.capital ? `<div class="empty-card"><b>${money(d.capital)} capital budget</b>No itemized capital-request schedule was available for this office.</div>` : `<div class="empty-card"><b>No FY2027 capital requests</b>No capital purchase or project request is budgeted for this office.</div>`)}</div>
    </div>
    <footer><span>FY 2027 Final Budget</span><b>${pageNumber}</b></footer>
  </section>`;
}

const startPage = Number(process.argv[3] || 27);

async function main() {
  let pageCounter = startPage;

  const dividerHtml = `
  <section style="position:relative;overflow:hidden;background:#003f28;padding:0;">
    <img class="divider-photo" src="${DEPARTMENTS_DIVIDER_PHOTO}" alt="">
    <div class="divider-frame"></div>
    <div class="divider">
      <span class="kicker2">Budget Book</span>
      <h1b>Board Department<br/>Budgets</h1b>
      <p>A statement of function, department goal, FY2027 operating context, services, funding sources, contracts, and performance measures for each of Walton County's ${DEPARTMENTS.length} Board offices and programs.</p>
    </div>
  </section>`;

  const totalFy27 = DEPARTMENTS.reduce((s, d) => s + d.personnel + d.contractual + d.operating + (d.indirect || 0) + d.capital + (d.other || 0), 0);
  const totalFte = DEPARTMENTS.reduce((s, d) => s + d.fte, 0);

  const overviewHtml = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Departments</small>
    <h1 style="border-bottom:none;padding-bottom:0;">Board Department Budgets</h1>
    <p class="sof">Each of the following ${DEPARTMENTS.length} pages presents one Board office or program in full: its statement of function, department goal, FY2027 operating context, services, funding sources, contracted services, budget by category (Personnel, Contractual, Operating, Capital), staffing, and verified performance measures where available. Each page carries a QR code linking to that office's live page online, which carries more detail than fits in print. Tourism Administration and Beach Operations are presented at the office level to match the online explorer hierarchy.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${DEPARTMENTS.length}</b><span>Offices Profiled</span></div>
      <div class="stat-card"><b>${money(totalFy27)}</b><span>Combined FY2027 Budget</span></div>
      <div class="stat-card"><b>${totalFte}</b><span>Combined FTE</span></div>
    </div>
    <h2 style="margin-top:.1in;">Offices in This Chapter</h2>
    <div class="index-list">
      ${DEPARTMENTS.map((d) => `<div class="index-row"><span>${d.name}</span><b>${money(d.personnel + d.contractual + d.operating + (d.indirect || 0) + d.capital + (d.other || 0))}</b></div>`).join("")}
    </div>
    <p class="sof" style="margin-top:.14in;">Accountability does not stop at organizational lines. Many community outcomes require several departments working together toward one result &mdash; the Program and Service Budget chapter groups these offices by the shared goal they fund, not just the org chart, and names every contributing department for each.</p>
    <footer><span>FY 2027 Final Budget</span><b>${pageCounter}</b></footer>
  </section>`;
  pageCounter++;

  const deptPages = [];
  for (const d of DEPARTMENTS) {
    deptPages.push(await buildDeptPage(d, pageCounter));
    pageCounter++;
  }

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Board Department Budgets</title>
<style>${sharedCss}</style></head>
<body>${dividerHtml}${overviewHtml}${deptPages.join("\n")}</body></html>`;

  const outPath = process.argv[2] || "/private/tmp/budget-book-departments-and-services.pdf";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.pdf({ path: outPath, format: "Letter", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  await browser.close();
  console.log("Wrote " + outPath + " (" + (2 + deptPages.length) + " pages)");
}

main();
