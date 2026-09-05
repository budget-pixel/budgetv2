import { chromium } from "playwright";
import QRCode from "qrcode";

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
    name: "Building Construction and Maintenance", fte: 68, personnel: 5427755, operating: 1683550, contractual: 235000, capital: 316000,
    deltaP: 169587, deltaO: -62450, deltaC: -1031000, video: "WJxzKl9sRNk", fund: "General Fund",
    sof: "The Building Construction and Maintenance Department includes the Facilities Maintenance, Custodian, and Parks Maintenance divisions. Facilities Maintenance provides new construction, remodeling, repair, maintenance, and treatment-plant maintenance assistance to support County departments and Constitutional offices. Parks maintains the grounds of parks, ballfields, County office building lawns, community centers, irrigation, fencing, playground equipment, and parking lot islands. Custodian provides cleaning services to County offices countywide.",
    goal: "Provide safe, clean, and efficient public facilities for staff, citizens, and visitors.",
    services: [
      ["Build and renew county facilities", "Plans and delivers construction, renovation, and major repair projects for county buildings."],
      ["Maintain public buildings", "Keeps county facilities safe, functional, and available for the people who use them."],
      ["Manage facility systems", "Coordinates building systems, preventive maintenance, and service requests across county operations."]
    ],
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
    changeNote: "Infrastructure decreasing by $855,000.",
    revenue: "Intergovernmental Revenues $7.1M &middot; General Government Taxes $1.4M &middot; Miscellaneous Revenue $343K",
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
      { q: "Number of work orders completed within the department's established timeframe per fiscal year", obj: "Complete ≥ 3,000 work orders annually within the department's established timeframes", y: ["3,000", "3,200", "3,439", "3,600"], target: "3,800" },
      { q: "Number of facilities maintained and inspected per year", obj: "Inspect and maintain County facilities and parks per year", y: ["113", "116", "115", "115"], target: "115" }
    ]
  },
  {
    name: "Building Department", fte: 21, personnel: 2312201, operating: 1687799, contractual: 0, capital: 0,
    deltaP: 198043, deltaO: -233043, deltaC: -165000, video: "3n4ns8jANzQ", fund: "Building Fund",
    sof: "The Building Department plays a pivotal role in ensuring the safety, compliance, and integrity of construction projects within the community, serving as the central hub for regulatory oversight and support throughout the construction process. Among its core responsibilities, the department issues contractor licenses, reviews permit applications, and conducts thorough inspections at various stages of construction to guarantee adherence to building codes and standards.",
    goal: "Ensure safe, quality construction.",
    services: [
      ["Review building plans", "Checks proposed construction for compliance with applicable building and safety requirements."],
      ["Issue permits", "Processes permits that authorize eligible construction, alteration, and related work."],
      ["Inspect construction", "Verifies permitted work at required stages before completion or occupancy."]
    ],
    challenges: "Responding to growing workloads while providing timely service, maintaining consistent enforcement, and adapting to changing regulatory and environmental conditions.",
    changeNote: "Operating Supplies decreasing by $214,429.",
    revenue: "Other Sources &mdash; Nonoperating Balance Brought Forward $4.0M",
    contracts: [],
    pms: [
      { q: "Number of building inspections conducted successfully per fiscal year", obj: "Complete building inspections annually with ≥ 98% accuracy", y: ["27,304", "27,502", "25,767", "28,000"], target: "28,000" },
      { q: "Number of contractor licenses issued and/or renewed per fiscal year", obj: "Issue or renew contractor licenses to qualified applicants", y: ["1,364", "1,468", "1,664", "1,700"], target: "1,700" }
    ]
  },
  {
    name: "Code Compliance", fte: 43, personnel: 4260744, operating: 463510, contractual: 87600, capital: 149000,
    deltaP: 352585, deltaO: 10110, deltaC: -265200, video: "Z78NL7Z-urs", fund: "General Fund",
    sof: "The primary function of Code Compliance is to uphold and enhance the aesthetics, property values, health and safety, and overall quality of life for the residents and visitors of Walton County, achieved through the fair, consistent, and equitable enforcement of codes, regulations, and ordinances across both Street and Beach enforcement areas.",
    goal: "Promote voluntary compliance to maintain community standards and resolve code violations.",
    services: [
      ["Respond to code concerns", "Receives and investigates reported conditions that may violate county codes."],
      ["Resolve property violations", "Works with property owners to correct documented violations and restore compliance."],
      ["Support neighborhood standards", "Conducts field activity and case follow-up that protect community health, safety, and appearance."]
    ],
    challenges: "Responding to growing workloads while providing timely service, maintaining consistent enforcement, and adapting to changing regulatory and environmental conditions.",
    revenue: "Miscellaneous Revenue $2.2M &middot; Permits, Fees & Special Assessments $1.8M &middot; Charges for Services $400K &middot; General Government Taxes $331K",
    capitalItems: [
      { item: "SUV (Replacement) &times;2", amount: 72000 },
      { item: "UTV (New) &times;4", amount: 76800 }
    ],
    contracts: [
      { service: "Special Magistrate Services", provider: "Hand Arendall Harrison", amount: 87600 }
    ],
    pms: [
      { q: "Percentage of code violations resolved through voluntary compliance without formal enforcement action", obj: "Encourage voluntary compliance through education and outreach", y: ["93.5%", "93.5%", "94%", "94%"], target: "95%" },
      { q: "Total number of street and beach code cases resolved annually", obj: "Efficiently resolve all identified street and beach code cases annually", y: ["10,643", "10,865", "10,215", "11,500"], target: "8,000" }
    ]
  },
  {
    name: "County Administration Offices", fte: 16, personnel: 2061039, operating: 134000, contractual: 0, capital: 65000,
    deltaP: -26864, deltaO: 2000, deltaC: 0, video: null, fund: "General Fund",
    sof: "Administration is responsible for executing the directives and priorities set forth by the Board of County Commissioners (BCC), ensuring efficient and effective governance within Walton County. Acting as the central hub of communication and coordination, Administration serves as the primary interface for County citizens, and as a supportive backbone for all county departments and a liaison to the Constitutional offices and municipalities within Walton County.",
    goal: "Deliver effective and transparent administration to support County operations.",
    services: [
      ["Carry out Board direction", "Coordinates implementation of policies and decisions adopted by the Board of County Commissioners."],
      ["Coordinate county operations", "Aligns departments, priorities, and executive decisions across Board-controlled government."],
      ["Serve as the public's point of contact", "Acts as the primary interface for citizens and a liaison to Constitutional offices and municipalities."]
    ],
    challenges: "Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities.",
    changeNote: "Machinery & Equipment increasing by $65,000.",
    revenue: "General Government Taxes &mdash; Ad Valorem Taxes $1.8M &middot; Miscellaneous Revenue &mdash; Indirect Administrative Fees $413K",
    capitalItems: [
      { item: "SUV (New)", amount: 65000 }
    ],
    contracts: [],
    pms: [
      { q: "Number of BCC directives, task orders, and agreements processed annually", obj: "Ensure timely implementation of BCC directives, task orders, and agreements", y: ["213", "215", "368", "350"], target: "360" },
      { q: "Number of public videos created on social media platforms", obj: "Create and publish more public videos to communicate initiatives and services", y: ["65", "83", "105", "120"], target: "130" }
    ]
  },
  {
    name: "Eagle Springs Golf and Recreation Center", fte: 12, personnel: 903055, operating: 596500, contractual: 100000, capital: 206000,
    deltaP: 33511, deltaO: 23500, deltaC: -225500, video: "d4o7JNx6o4s", fund: "General Fund",
    sof: "Walton County owns one golf course, Eagle Springs Golf and Recreation Center, purchased by the Board of County Commissioners in 2019 to provide economic development and enhance quality of life through sports and recreation. Eagle Springs consists of 190 acres containing an 18-hole golf course and four spring-fed lakes, with more than 30,000 rounds played annually, a driving range, pro shop, pickleball courts, a public swimming pool, and a walking path.",
    goal: "Provide high-quality and accessible recreational opportunities for all residents and visitors.",
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
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
    sof: "Eagle Springs Grill strives on providing exceptional service to the community and ensuring quality food is produced for all patrons, including golfers and pool attendees. The Grill consistently feeds charity golf tournaments as well as private events including wedding receptions, class reunions, and family gatherings throughout the year.",
    goal: "Provide exceptional dining and event services that enhance community engagement.",
    challenges: "Maintaining dependable customer service while managing food, supply, labor, and operating costs that can change quickly.",
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
    name: "Emergency Management", fte: 6, personnel: 704526, operating: 176829, contractual: 6100, capital: 25000,
    deltaP: 43275, deltaO: 40029, deltaC: 0, video: "7arI_NS6Q2U", fund: "General Fund",
    sof: "The Emergency Management Department is responsible for all aspects of disaster management 24 hours a day, seven days a week, taking a “Whole Community Approach” that is a collaborative effort involving government agencies, non-profit organizations, businesses, and community members. The Emergency Operations Center serves as the central hub for communications, command, and coordination for disasters in Walton County.",
    goal: "Enhance community preparedness, readiness, and resilience through education, training, outreach, and volunteer engagement.",
    services: [
      ["Prepare for emergencies", "Develops plans, training, and coordination arrangements before disasters occur."],
      ["Coordinate emergency response", "Connects agencies, information, and resources during an emergency activation."],
      ["Support community recovery", "Coordinates recovery information, assistance, and continuity after an emergency."]
    ],
    challenges: "Maintaining year-round readiness for unpredictable events, seasonal demand, severe weather, and competition for trained personnel and specialized equipment.",
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
      { q: "Number of community outreach events held, and total participants reached per fiscal year", obj: "Enhance community preparedness through outreach and education", y: ["23 / 20,000", "23 / 20,000", "23 / 21,000", "24 / 22,000"], target: "24 / 22,000" },
      { q: "Number of CERT volunteer hours contributed per fiscal year", obj: "Increase volunteer engagement through CERT to build capacity and resilience", y: ["2,500", "2,500", "2,500", "2,500"], target: "2,500" }
    ]
  },
  {
    name: "Engineering Department", fte: 14, personnel: 2083118, operating: 151000, contractual: 100000, capital: 45000,
    deltaP: -95460, deltaO: 0, deltaC: 0, video: null, fund: "Transportation Fund",
    sof: "The primary function of the County Engineering Department is to manage the design and construction of Walton County infrastructure projects, including capital improvement design and construction management, traffic operations, right-of-way permitting, surveying, FDOT grant administration, and utility/engineering oversight for the Mossy Head sewer system.",
    goal: "Support infrastructure planning and delivery by maintaining and updating the Capital Improvement Plan.",
    services: [
      ["Design and manage capital projects", "Provides in-house capital improvement design and construction management for county infrastructure."],
      ["Oversee traffic and right-of-way", "Coordinates traffic operations, right-of-way permitting, and surveying for county roadways."],
      ["Administer transportation grants", "Manages FDOT grant administration and engineering oversight for the Mossy Head sewer system."]
    ],
    achievement: { label: "In-House Engineering Savings", detail: "Performing capital improvement design and construction management in-house, rather than through outside consultants, is estimated to save the County $1,660,880 in FY2027." },
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
    revenue: "General Government Taxes &mdash; Local Option Fuel Tax $2.4M",
    capitalItems: [
      { item: "4x4 Crew Cab Truck (New)", amount: 45000 }
    ],
    contracts: [
      { service: "Professional Services (task order, capital improvement projects)", provider: "Not listed", amount: 100000 }
    ],
    pms: [
      { q: "Was the five-year Capital Improvement Plan (CIP) updated and approved?", obj: "Update and gain approval of the five-year Capital Improvement Plan annually", y: ["N/A", "N/A", "Yes", "Yes"], target: "Yes" },
      { q: "Has the department website been updated to reflect the current status of active projects?", obj: "Maintain the department website with current information on active projects", y: ["N/A", "N/A", "Yes", "Yes"], target: "Yes" }
    ]
  },
  {
    name: "Environmental Resources", fte: 4, personnel: 451831, operating: 114216, contractual: 62875, capital: 20000,
    deltaP: 1304, deltaO: -168284, deltaC: -25000, video: null, fund: "General Fund",
    sof: "The Walton County Environmental Resource serves as the cornerstone for environmental stewardship within the county, providing comprehensive environmental support services to County government, citizens, and federal, state, and local government agencies — from conservation and preservation of ecosystems to sustainable development practices.",
    goal: "Protect and enhance Walton County's natural resources through proactive conservation, compliance, and restoration initiatives.",
    challenges: "Responding to growing workloads while providing timely service, maintaining consistent enforcement, and adapting to changing regulatory and environmental conditions.",
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
    ],
    footnote: true
  },
  {
    name: "Extension Office", fte: 8.5, personnel: 514924, operating: 39395, contractual: 0, capital: 40000, other: 3000,
    deltaP: -23186, deltaO: -20205, deltaC: 0, video: "ZNGKeoZlogc", fund: "General Fund",
    sof: "The Walton County Extension Service provides scientifically based information for current and pertinent issues that enable county residents to make informed decisions that improve their quality of life. Access to this knowledge is provided by University of Florida trained professionals (extension agents), cooperatively funded by the County, the University of Florida, the U.S. Department of Agriculture, and other joint cooperators.",
    goal: "Provide relevant, research-based education and outreach to improve the quality of life for Walton County residents.",
    challenges: "Meeting changing community needs while managing caseloads, maintaining public access, and delivering reliable service with limited staffing and program capacity.",
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
    challenges: "Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities.",
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
    challenges: "Meeting changing community needs while managing caseloads, maintaining public access, and delivering reliable service with limited staffing and program capacity.",
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
    challenges: "Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities.",
    revenue: "Intergovernmental Revenues $1.1M &middot; Miscellaneous Revenue &mdash; Indirect Administrative Fees $323K",
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
    name: "Libraries", fte: 22.5, personnel: 1625655, operating: 380000, contractual: 60000, capital: 150000,
    deltaP: 272392, deltaO: 10300, deltaC: -22000, video: "gJ7QNzqj8ks", fund: "General Fund",
    sof: "The Public Library System supports free access to library services throughout Walton County with facilities in Flowersview, DeFuniak Springs, Freeport, and Santa Rosa Beach, plus a bookmobile serving schools and assisted living facilities. Libraries provide circulation, maker equipment, digital resources, Interlibrary Loan, and Career Online High School diploma programs for adult learners.",
    goal: "Deliver high-quality library services, resources, and programs that foster learning, literacy, and community engagement.",
    challenges: "Meeting changing community needs while managing caseloads, maintaining public access, and delivering reliable service with limited staffing and program capacity.",
    revenue: "Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $2.1M &middot; Charges for Services & Miscellaneous $21K",
    contracts: [
      { service: "Integrated Library System (ILS)", provider: "The Library Corporation", amount: 60000 }
    ],
    pms: [
      { q: "Total number of visitors and program attendees annually", obj: "Provide diverse on-site programs and outreach services to engage visitors of all ages", y: ["136,843", "143,477", "215,223", "220,000"], target: "230,000" },
      { q: "Number of new items added to the library collection (physical and digital) annually", obj: "Maintain and grow physical and digital collections to meet community needs", y: ["5,873", "6,467", "8,844", "7,000"], target: "7,000" }
    ]
  },
  {
    name: "Mosquito Control", fte: 8, personnel: 673438, operating: 662499, contractual: 0, capital: 91000,
    deltaP: -67045, deltaO: 168982, deltaC: -15000, video: "U5q2lymuFys", fund: "Mosquito Control Fund",
    sof: "The Mosquito Control Department is dedicated to protecting public health and enhancing quality of life for residents and visitors by managing mosquito populations through surveillance, larval control, and public education, aimed at minimizing nuisance and reducing the risk of mosquito-borne disease.",
    goal: "Protect public health and enhance quality of life by managing mosquito populations through effective, innovative, and environmentally responsible practices.",
    challenges: "Responding to growing workloads while providing timely service, maintaining consistent enforcement, and adapting to changing regulatory and environmental conditions.",
    changeNote: "Indirect Admin Allocation increasing by $146,557.",
    revenue: "General Government Taxes &mdash; Ad Valorem Taxes $1.4M",
    capitalItems: [
      { item: "4x4 Cab Truck (New)", amount: 55000 },
      { item: "ULV Spray Unit (New) &times;2", amount: 36000 }
    ],
    contracts: [],
    pms: [
      { q: "Total number of acres treated per fiscal year", obj: "Implement targeted mosquito control interventions using science-based techniques", y: ["355,025", "473,516", "575,734", "580,000"], target: "610,000" },
      { q: "Number of site inspections performed per fiscal year", obj: "Conduct regular site inspections to identify and mitigate mosquito breeding grounds", y: ["4,936", "5,303", "8,289", "9,600"], target: "9,750" }
    ],
    footnote: true
  },
  {
    name: "Mossy Head Wastewater Treatment Facility", fte: 1, personnel: 94800, operating: 219200, contractual: 150000, capital: 0,
    deltaP: 9940, deltaO: 7532, deltaC: -956000, video: null, fund: "Transportation Fund",
    sof: "The Mossy Head Wastewater Sewer System provides gravity and force main sewer service for the Northwest Commerce Industrial Park area. The department's objective is to ensure the manpower and resources necessary to operate and maintain the plant and collection system in a cost-effective manner within FDEP guidelines, while planning for future growth and expansion.",
    goal: "Operate and maintain the wastewater treatment facility and sewer system to ensure reliable service, regulatory compliance, and readiness for future growth.",
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
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
      ["Build the annual budget", "Coordinates department requests, revenue estimates, balancing, and the tentative county budget."],
      ["Monitor public spending", "Tracks budget performance and supports amendments throughout the fiscal year."],
      ["Explain financial decisions", "Produces schedules, forecasts, analysis, and public budget information for decision-making."]
    ],
    achievement: { label: "GFOA Distinguished Budget Presentation Award", detail: "Walton County has received the Government Finance Officers Association's Distinguished Budget Presentation Award for FY2025 and FY2026, recognizing the County's budget document as a policy document, financial plan, operations guide, and communications device." },
    challenges: "Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities.",
    changeNote: "Books, Publications, Subscriptions or Memberships decreasing by $260,000.",
    revenue: "Miscellaneous Revenue &mdash; Indirect Administrative Fees $619K &middot; Intergovernmental Revenues $441K &middot; Charges for Services $15K",
    contracts: [],
    pms: [
      { q: "Percentage of budget prepared in compliance with Florida Statutes and Truth in Millage requirements", obj: "Prepare and present an annual budget in full compliance with Florida Statutes and Truth in Millage requirements", y: ["100%", "100%", "100%", "100%"], target: "100%" },
      { q: "Total amount of grant expenditures managed per fiscal year", obj: "Manage grant funding responsibly to maximize resources and support County programs", y: ["$14.3M", "$10.4M", "$16.7M", "$15.6M"], target: "$10M" }
    ]
  },
  {
    name: "Office of the County Attorney", fte: 9, personnel: 1052925, operating: 100000, contractual: 650000, capital: 0,
    deltaP: -188551, deltaO: -1999, deltaC: 0, video: null, fund: "General Fund",
    sof: "Under the direction of the County Attorney, the Office of the County Attorney provides legal services to the County across three primary areas: Contracts (drafting or reviewing all documents that legally bind the County), Litigation (representing the Board in all court cases involving the County), and Public Records (records management and support for public records requests).",
    goal: "Provide effective legal services, contract support, and public records management to ensure compliance, accountability, and transparency.",
    services: [
      ["Advise county government", "Provides legal counsel to the Board and Board-controlled departments."],
      ["Prepare and review legal documents", "Reviews ordinances, resolutions, agreements, contracts, and other county instruments."],
      ["Represent the county", "Manages litigation, claims, hearings, and other legal proceedings involving the county."]
    ],
    challenges: "Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities.",
    revenue: "Intergovernmental Revenues &mdash; State Revenue Share $933K &middot; General Government Taxes &mdash; Ad Valorem $675K &middot; Miscellaneous Revenue $193K",
    contracts: [
      { service: "County Attorney Legal Services", provider: "Clay Adkinson", amount: 650000 }
    ],
    pms: [
      { q: "Number of contracts, agreements, and procurement documents reviewed per fiscal year", obj: "Review contracts, agreements, and procurement documents to ensure proper execution", y: ["380", "380", "380", "390"], target: "400" },
      { q: "Average response time for processing public records requests, measured in days", obj: "Respond to public records requests promptly and manage records effectively", y: ["5", "5", "5", "4.5"], target: "4.5" }
    ]
  },
  {
    name: "Planning", fte: 47, personnel: 4961086, operating: 656025, contractual: 1222000, capital: 209000,
    deltaP: 347042, deltaO: -78017, deltaC: 0, video: "lKTWu2Q-6ug", fund: "General Fund",
    sof: "The Walton County Planning & Development Services Department serves as staff and provides professional land use planning advice to the Board of County Commissioners, implementing and updating the Comprehensive Plan and Land Development Code, concurrency and floodplain management, and development review. The Department also staffs the Planning Commission, Zoning Board of Adjustments, Design Review Board, and Affordable Housing Committee.",
    goal: "Provide timely, customer-focused planning and permitting services that promote sustainable growth, protect natural resources, and ensure compliance.",
    services: [
      ["Guide long-range growth", "Maintains planning policies that shape future land use and community development."],
      ["Review development proposals", "Evaluates applications for consistency with county plans and land-development requirements."],
      ["Support public land-use decisions", "Provides analysis, public-process support, and recommendations for planning decisions."]
    ],
    challenges: "Responding to growing workloads while providing timely service, maintaining consistent enforcement, and adapting to changing regulatory and environmental conditions.",
    revenue: "Charges for Services &mdash; Planning & Short-Term Rental Fees $3.5M &middot; Intergovernmental Revenues $2.3M &middot; General Government Taxes $1.2M",
    capitalItems: [
      { item: "Short-Term Rental Building Improvements (New)", amount: 100000 },
      { item: "SUV (Replacement)", amount: 60000 },
      { item: "Short-Term Rental SUV (New)", amount: 49000 }
    ],
    contracts: [
      { service: "Land Development Code (LDC) Update", provider: "Not listed", amount: 282000 },
      { service: "South Walton Fire District STR Fire Code Compliance", provider: "South Walton Fire District", amount: 220000 },
      { service: "Call-Line 24/Service & Short-Term Rental Software", provider: "OpenGov, Inc", amount: 250000 },
      { service: "Call-Line 24/Service & Short-Term Rental Software", provider: "GovOS", amount: 210000 }
    ],
    contractsNote: "Plus Local Mitigation Strategy Update ($150,000) and Continuing Maintenance Services ($110,000), both task-order professional services.",
    pms: [
      { q: "Percentage of development projects that meet MS4 permitting requirements", obj: "Ensure development projects meet MS4 permitting requirements to protect water quality", y: ["100%", "100%", "100%", "100%"], target: "100%" },
      { q: "Number of permits processed through the new EnerGov system", obj: "Improve efficiency and customer experience while meeting statutory review deadlines", y: ["3,973", "4,646", "4,782", "4,750"], target: "5,800" }
    ]
  },
  {
    name: "Probation", fte: 4, personnel: 329527, operating: 22050, contractual: 19000, capital: 0,
    deltaP: 5072, deltaO: 850, deltaC: 0, video: null, fund: "General Fund",
    sof: "The Probation Department fulfills a vital role collaborating with the judicial system to enforce court-ordered obligations for probationers sentenced to county probation, monitoring their progress to ensure compliance with court-ordered conditions.",
    goal: "Ensure compliance with court-ordered probation conditions and provide effective supervision and support for probationers.",
    challenges: "Meeting changing community needs while managing caseloads, maintaining public access, and delivering reliable service with limited staffing and program capacity.",
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
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
    changeNote: "Infrastructure increasing by $2,646,500.",
    revenue: "Other Sources &mdash; Small County Surtax Transfer & Balance Forward $19.5M &middot; Intergovernmental Revenues $3.4M &middot; General Government Taxes $2.4M &middot; Miscellaneous Revenue $2.5M",
    contracts: [
      { service: "Guardrail Services", provider: "Grading & Bush Hog Services, Inc", amount: 200000 },
      { service: "Thermo-striping Services", provider: "Emerald Coast Striping, LLC", amount: 200000 },
      { service: "Traffic Signal Services", provider: "Murdock Investments, LLC", amount: 125000 },
      { service: "DeFuniak Springs Interlocal Road Maintenance", provider: "City of DeFuniak Springs", amount: 50000 }
    ],
    contractsNote: "Plus $100,000 in task order professional services and interlocal road-maintenance agreements with the cities of Freeport and Paxton (no cost committed for FY2027).",
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
      { q: "Number of capital improvement projects completed per fiscal year", obj: "Plan and complete capital improvement projects that enhance infrastructure sustainability", y: ["11", "10", "18", "17"], target: "23" },
      { q: "Number of miles of road maintained or improved per fiscal year (unpaved and paved roads)", obj: "Maintain and improve paved and unpaved roadways to enhance mobility and safety", y: ["1,046", "1,046", "1,046", "1,049"], target: "1,049" }
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
    challenges: "Supporting a growing organization while recruiting and retaining skilled staff, modernizing systems, meeting compliance requirements, and responding to competing priorities.",
    changeNote: "Books, Publications, Subscriptions or Memberships increasing by $64,000.",
    revenue: "Intergovernmental Revenues $865K &middot; Miscellaneous Revenue &mdash; Indirect Administrative Fees $212K",
    capitalItems: [
      { item: "Procurement Building Improvements (New)", amount: 50000 }
    ],
    contracts: [
      { service: "Purchasing Software", provider: "OpenGov", amount: 65000 }
    ],
    pms: [
      { q: "Total number of purchase orders processed per fiscal year", obj: "Streamline purchasing processes through technology and standardized procedures", y: ["4,389", "5,900", "4,596", "5,000"], target: "5,000" },
      { q: "Total number of formal solicitations per fiscal year", obj: "Ensure compliance and transparency in competitive procurement", y: ["18", "21", "30", "25"], target: "28" }
    ]
  },
  {
    name: "Recreation", fte: 6, personnel: 591658, operating: 211735, contractual: 0, capital: 30000,
    deltaP: 4949, deltaO: -865, deltaC: -30000, video: "ODzfUR4KX2o", fund: "General Fund",
    sof: "The Recreation Department is essential to improving the community's quality of life by providing safe, well-maintained, and ever-evolving recreational programs designed to promote physical and mental well-being for citizens of all ages, with a particular emphasis on youth development.",
    goal: "Provide diverse recreational programs that enhance community health, engagement, and quality of life.",
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
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
    challenges: "Meeting changing community needs while managing caseloads, maintaining public access, and delivering reliable service with limited staffing and program capacity.",
    revenue: "Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $150K",
    contracts: [],
    pms: [
      { q: "Number of EQIP contracts approved and total acreage managed under the program per fiscal year", obj: "Facilitate USDA conservation programs (EQIP and CSP) to help landowners implement conservation practices", y: ["66 / 14,768", "84 / 17,553", "80 / 13,918", "76 / 15,189"], target: "80 / 15,500" },
      { q: "Number of CSP contracts approved and total acreage managed under the program per fiscal year", obj: "Provide guidance, hydrologic data, and mapping resources to support conservation planning", y: ["4 / 1,782", "8 / 2,183", "18 / 9,782", "19 / 9,987"], target: "20 / 10,000" }
    ],
    footnote: true
  },
  {
    name: "Solid Waste", fte: 28, personnel: 2377275, operating: 1752292, contractual: 200000, capital: 1800000,
    deltaP: 42984, deltaO: -59614, deltaC: 1140000, video: "iz8DOXLQ8yU", fund: "Solid Waste Fund",
    sof: "Walton County Solid Waste manages the Franchise Agreement with Waste Management Inc. for municipal waste collection and disposal, and oversees daily operations of the Walton County Central Landfill — a Class I Transfer Station, Class III Landfills, recycling facilities, a yard waste facility, a waste tire collection center, and a groundwater monitoring system, all permitted by FDEP.",
    goal: "Ensure regulatory compliance, operational efficiency, and protection of natural resources across all waste streams.",
    challenges: "Keeping pace with growth while maintaining aging assets, managing construction costs, and scheduling work with limited staff and equipment.",
    changeNote: "Machinery & Equipment increasing by $1,140,000.",
    revenue: "General Government Taxes &mdash; Discretionary Sales Surtax $40.0M &middot; Charges for Services &mdash; Landfill Fees $560K",
    contracts: [
      { service: "Waste Collection and Disposal Franchise Services", provider: "Waste Management Inc of Florida", amount: 17000000, separate: true },
      { service: "Iron Remediation System Remedial Action Plan Modifications", provider: "Not listed", amount: 100000 },
      { service: "Annual Compliance Monitoring Services", provider: "Not listed", amount: 100000 }
    ],
    contractsNote: "The $17.0M franchise agreement is tracked separately from the operating total above, not folded into it.",
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
    ],
    footnote: true
  },
  {
    name: "Tourism Lifeguard Services and Beach Safety", fte: 0, personnel: 0, operating: 0, contractual: 3380779, capital: 0,
    deltaP: 0, deltaO: 130030, deltaC: 0, video: null, fund: "Tourist Development Fund",
    entityType: "Purchased Service",
    sof: "Under the Lifeguard Services Agreement with Walton County, the South Walton Fire District receives annual funding to support beach safety operations. Beginning in 2025, the agreement includes a 4% annual increase in compensation based on the prior year's amount to help sustain service levels as costs rise — ensuring lifeguard staffing, training, and equipment needs are met.",
    goal: "Provide dependable beach-safety and lifeguard coverage through the County's service agreement with South Walton Fire District.",
    services: [
      ["Provide guarded-beach coverage", "Funds trained lifeguard coverage at designated locations under the service agreement."],
      ["Respond to beach emergencies", "Supports water rescue, first response, and coordination with public-safety partners."],
      ["Reduce preventable incidents", "Supports visitor education, hazard awareness, training, and readiness activities."]
    ],
    serviceChange: "Maintained service scope with a 4% contractual funding increase required by the agreement.",
    partners: "South Walton Fire District, Walton County Tourism, Emergency Management, law enforcement, and other responding agencies.",
    challenges: "Maintaining year-round readiness for unpredictable events, seasonal demand, severe weather, and competition for trained personnel and specialized equipment.",
    changeNote: "Other Services increasing by $130,030.",
    revenue: "No dedicated revenue &mdash; funded by the Tourist Development Fund.",
    contracts: [
      { service: "South Walton Fire Lifeguard Services", provider: "South Walton Fire District", amount: 3380779 }
    ],
    pms: []
  },
  {
    name: "Veteran Services", fte: 3, personnel: 298724, operating: 17926, contractual: 0, capital: 0,
    deltaP: 80324, deltaO: 226, deltaC: 0, video: "v4tpooBZoPs", fund: "General Fund",
    sof: "The Veteran Services Department works to communicate with every veteran and their dependents in Walton County, to administer and advocate for all the benefits they have earned, providing excellent customer service in a manner that depicts the gratitude and honor reserved for those who have sacrificed so much.",
    goal: "Deliver timely, effective, and informative assistance to veterans and their families.",
    challenges: "Meeting changing community needs while managing caseloads, maintaining public access, and delivering reliable service with limited staffing and program capacity.",
    revenue: "Intergovernmental Revenues &mdash; Local Government 1/2 Cent Sales Tax $317K",
    contracts: [],
    pms: [
      { q: "Number of claims processed for veterans per fiscal year", obj: "Process ≥ 1,000 claims per fiscal year", y: ["752", "1,023", "1,074", "1,050"], target: "1,100" },
      { q: "Number of outreach presentations or events held for veterans", obj: "Conduct ≥ 3 outreach presentations or events for veterans each fiscal year", y: ["3", "2", "3", "3"], target: "5" }
    ]
  },
  {
    name: "Tourism Administration", entityType: "Tourism Administration Office", fte: 4, personnel: 631415, operating: 2608585, contractual: 0, capital: 50000,
    deltaP: 291333, deltaO: 0, deltaC: 0, video: null, fund: "Tourist Development Fund",
    sof: "Tourism Administration provides executive leadership, financial stewardship, strategic coordination, and administrative support for Walton County Tourism. The office sustains the revenue base needed for visitor services and tourism-funded community investments while coordinating the work of marketing, communications, sales, visitor services, beach operations, and industry partners.",
    goal: "Strengthen and promote the Walton County tourism brand to attract visitors and enhance the local economy.",
    services: [["Lead tourism strategy","Sets priorities and coordinates tourism programs and investments."],["Steward tourism resources","Oversees Tourist Development Tax-supported budgets, contracts, and compliance."],["Support partners and offices","Aligns staff, industry partners, and community stakeholders around a year-round destination strategy."]],
    challenges: "Maintaining a stable visitor-funded revenue base while balancing destination demand, community quality of life, statutory uses of Tourist Development Tax, and long-term infrastructure needs.",
    changeNote: "Total office funding increasing by $291,333.",
    revenue: "Tourist Development Tax on eligible short-term lodging stays",
    capitalItems: [{item:"Administrative capital and equipment",amount:50000}], contracts: [],
    pms: [{q:"Tourism-supported jobs in Walton County",obj:"Foster sustainable tourism that supports local jobs annually",y:["47,000","47,000","41,600","33,800"],target:"32,000"},{q:"Average Daily Rate for Walton County lodging",obj:"Position Walton County as a high-value destination",y:["$413","$413","$385","$352"],target:"$375"}]
  },
  {
    name: "Sales and Visitors Center", entityType: "Tourism Administration Office", fte: 9, personnel: 863987, operating: 948575, contractual: 137438, capital: 0,
    deltaP: 159277, deltaO: 0, deltaC: 0, video: null, fund: "Tourist Development Fund",
    sof: "The Group Sales team generates new business opportunities and builds awareness of Walton County for meetings and conventions, incentives, weddings, and consumer travel. Visitor Center staff provide trusted destination information and help connect guests with local places, services, and experiences.",
    goal: "Generate qualified group business and provide accurate, welcoming visitor information that supports a positive Walton County experience.",
    services: [["Develop group business","Builds relationships with meeting, wedding, incentive, and travel planners."],["Operate visitor services","Provides in-person destination guidance, materials, and referrals."],["Represent the destination","Participates in sales missions, trade activity, and partner outreach."]],
    challenges: "Converting competitive group opportunities while maintaining timely, consistent visitor service across changing travel patterns and seasonal demand.", changeNote:"Total office funding increasing by $159,277.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays", contracts:[{service:"Advertising Services",provider:"Zehnder, Inc · Contract 24-27",amount:137438}], pms:[]
  },
  {
    name: "Communications", entityType: "Tourism Administration Office", fte: 5, personnel: 515869, operating: 320131, contractual: 114000, capital: 0,
    deltaP: 55555, deltaO: 0, deltaC: 0, video: null, fund: "Tourist Development Fund",
    sof: "The Communications Division supports Walton County Tourism through earned and owned media that inspire travel and inform visitors, residents, partners, and stakeholders. The division manages strategic communications, public relations, media activities, familiarization tours, press visits, industry relations, and community education about tourism's local value.",
    goal: "Build informed, credible relationships that strengthen destination awareness and understanding of tourism's role in Walton County.",
    services: [["Manage public relations","Coordinates media relations, press visits, releases, and destination storytelling."],["Inform partners and residents","Shares timely tourism information with community and industry stakeholders."],["Build owned content","Develops useful content across County tourism communication channels."]],
    challenges:"Maintaining trust and message consistency across fast-moving media channels while serving visitors, residents, partners, and stakeholders with different information needs.", changeNote:"Total office funding increasing by $55,555.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays", contracts:[{service:"Public Relations Services",provider:"Turner Public Relations, LLC · Contract 25-17",amount:114000}], pms:[]
  },
  {
    name: "Marketing", entityType: "Tourism Administration Office", fte: 4, personnel: 408142, operating: 1592061, contractual: 12502247, capital: 0,
    deltaP: 667858, deltaO: 0, deltaC: 0, video: null, fund: "Tourist Development Fund",
    sof: "The Marketing Division uses research, creative campaigns, digital channels, social media, and travel-trade coordination to communicate Walton County's destination experiences to priority audiences. This work supports visitor spending, local employment, and a diversified tourism economy.",
    goal:"Use research-led marketing to sustain high-value visitation and measurable economic benefit for Walton County.",
    services:[["Plan and place destination advertising","Develops integrated campaigns and media investments for priority markets."],["Manage digital visitor engagement","Operates web, social, email, customer-relationship, and digital-asset platforms."],["Measure market performance","Uses tourism research and analytics to guide audiences, timing, and investment."]],
    challenges:"Adapting to travel demand and media-market changes while demonstrating return on a large visitor-funded advertising investment and managing visitation responsibly.", changeNote:"Total office funding increasing by $667,858.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays",
    contracts:[{service:"Advertising Services",provider:"Zehnder, Inc · Contract 24-27",amount:11951147},{service:"Regional Tourism Communications Partnership",provider:"Florida's Coastal Northwest Communications Council",amount:265500},{service:"Tourism Analytics Platform",provider:"Key Data Dashboard, Inc",amount:84600},{service:"Public Relations",provider:"Turner Public Relations, LLC · Contract 25-17",amount:86000}],
    contractsNote:"Also includes marketing research ($65,000), digital asset management ($25,000), and customer relationship management ($25,000).", pms:[]
  },
  {
    name: "North Walton", entityType: "Tourism Administration Office", fte: 0, personnel: 0, operating: 355500, contractual: 0, capital: 0,
    deltaP: 32500, deltaO: 0, deltaC: 0, video: null, fund: "North Walton Tourist Development Tax District",
    sof:"North Walton tourism funding builds awareness of Walton County destinations and experiences north of Choctawhatchee Bay. The program supports eligible destination promotion and visitor-development activity within the North Walton Tourist Development Tax district.",
    goal:"Increase awareness of North Walton as a visitor destination while directing restricted district revenue to eligible uses.",
    services:[["Promote North Walton","Builds destination awareness for communities and experiences north of the bay."],["Support local tourism partners","Connects eligible businesses, attractions, and events with destination activity."],["Steward restricted district funds","Directs North Walton Tourist Development Tax resources to authorized purposes."]],
    challenges:"Growing awareness with a smaller, geographically restricted revenue base while maintaining a distinct identity within the countywide destination strategy.", changeNote:"Program funding increasing by $32,500.",
    revenue:"North Walton Tourist Development Tax collected on eligible short-term lodging stays north of the Intracoastal Waterway", contracts:[], pms:[]
  },
  {
    name: "Beach Operations", entityType: "Beach Operations Office", fte: 66, personnel: 4991699, operating: 4635801, contractual: 1470000, capital: 1902500,
    deltaP: 2528302, deltaO: 0, deltaC: 0, video: null, fund: "Tourist Development Fund",
    sof:"Beach Operations maintains the cleanliness, function, and accessibility of Walton County's coastal public spaces. Its work includes beach and bay access maintenance, regional access and parking facilities, multi-use trails, scenic corridors, landscaping, equipment, and related visitor infrastructure.",
    goal:"Maintain clean, reliable, and accessible beach and bay facilities and infrastructure for visitors.",
    services:[["Maintain beach and bay facilities","Cleans, repairs, and supports public access facilities throughout the visitor season."],["Care for scenic corridors","Maintains landscaping and public-facing infrastructure along major tourism corridors."],["Deliver access improvements","Coordinates equipment and capital work that improves safety, function, and accessibility."]],
    serviceChange:"Adds staffing and capital capacity to support growing maintenance demands and expanded public infrastructure.",
    challenges:"Meeting peak-season service demand across a growing coastal asset network while responding to weather, erosion, traffic, workforce, and equipment pressures.", changeNote:"Total office funding increasing by $2,528,302.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays",
    capitalItems:[{item:"Beach Operations vehicles, machinery and equipment",amount:1902500}],
    contracts:[{service:"SR 83 (US 331) Landscaping Improvements",provider:"C&A Landscape Maintenance, LLC · Contract 25-26",amount:515000},{service:"US Highway 331 Median & Right-of-Way Maintenance",provider:"Harper Landscaping, LLC · Contract 22-028",amount:455000},{service:"Highway 98 Median & Right-of-Way Maintenance",provider:"ZIIC Outdoors, LLC · Contract 020-016",amount:300000},{service:"Task Order Services",provider:"Multiple providers as authorized",amount:200000}],
    pms:[{q:"Beach and bay public access facilities cleaned daily",obj:"Clean all beach and bay public access facilities daily during peak season",y:["60","60","62","63"],target:"66"},{q:"Maintenance work orders completed",obj:"Complete at least 6,000 maintenance work orders annually",y:["4,177","5,111","5,970","6,000"],target:"6,000"}]
  },
  {
    name:"Beach Renourishment", entityType:"Beach Operations Office", fte:0, personnel:0, operating:0, contractual:250000, capital:10750000,
    deltaP:1000000, deltaO:0, deltaC:0, video:null, fund:"Tourist Development Fund",
    sof:"Beach Renourishment preserves and restores Walton County's 26 miles of beach, the destination's principal natural asset. Funding supports planning, engineering, permitting, monitoring, and construction activity needed to sustain the shoreline and protect public investment.",
    goal:"Preserve the county's beaches through planned, permitted, and financially sustainable shoreline restoration.",
    services:[["Plan shoreline restoration","Develops technical scope, schedules, permits, and funding strategies."],["Deliver renourishment projects","Coordinates eligible construction and beach-placement activity."],["Monitor beach conditions","Supports engineering, environmental review, and post-project monitoring."]],
    challenges:"Navigating permitting, environmental windows, storm impacts, material availability, construction pricing, and the timing of large multi-year shoreline projects.", changeNote:"Program funding increasing by $1,000,000.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays", capitalItems:[{item:"Beach Renourishment Program",amount:10750000}], contracts:[{service:"Beach Renourishment Task Order Services",provider:"Multiple professional-service providers",amount:250000}], pms:[]
  },
  {
    name:"Beach Tram", entityType:"Beach Operations Office", fte:56, personnel:3813305, operating:921916, contractual:0, capital:507000,
    deltaP:1726095, deltaO:0, deltaC:0, video:null, fund:"Tourist Development Fund",
    sof:"The Beach Tram Program provides free shuttle service between designated parking locations and key beach access points. The service improves access to popular beach areas, reduces parking demand and congestion, and supports a more convenient and sustainable visitor experience.",
    goal:"Provide safe, reliable, and convenient beach transportation that improves access and reduces vehicle pressure in high-demand areas.",
    services:[["Operate beach shuttles","Transports passengers between designated parking and beach access locations."],["Maintain fleet readiness","Coordinates drivers, mechanics, dispatch, inspections, and vehicle availability."],["Improve coastal mobility","Reduces parking demand and expands access for residents and visitors."]],
    serviceChange:"Expands driver and crew capacity and provides capital funding to support a higher FY2027 ridership target.",
    challenges:"Recruiting seasonal drivers, managing congestion and peak demand, maintaining fleet reliability, and adapting service to weather and changing access conditions.", changeNote:"Total program funding increasing by $1,726,095.",
    revenue:"Tourist Development Tax on eligible short-term lodging stays", capitalItems:[{item:"Beach Tram vehicles and transportation equipment",amount:507000}], contracts:[],
    pms:[{q:"Passengers transported annually by the shuttle service",obj:"Transport at least 200,000 passengers annually",y:["77,282","193,725","168,203","200,000"],target:"250,000"}]
  }
];

function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
function pct(delta, base) { return base === 0 ? "N/A" : (delta >= 0 ? "+" : "") + ((delta / base) * 100).toFixed(1) + "%"; }

function serviceChangeFor(d) {
  if (d.serviceChange) return d.serviceChange;
  return "No separately identified service addition or discontinuation; core services are maintained in the FY2027 tentative budget.";
}

function partnersFor(d) {
  if (d.partners) return d.partners;
  const n = d.name.toLowerCase();
  if (/building|planning|code|engineering/.test(n)) return "Planning and Development Services, Public Works, County Administration, municipalities, state agencies, and affected service departments.";
  if (/emergency/.test(n)) return "Fire districts, law enforcement, public works, health providers, municipalities, state and federal emergency-management agencies, nonprofits, and community volunteers.";
  if (/environment|mosquito|soil|solid waste/.test(n)) return "Public Works, Planning, municipalities, state and federal environmental agencies, contracted providers, and community partners.";
  if (/human resources|management and budget|attorney|purchasing|administration/.test(n)) return "All Board departments, Constitutional Officers when applicable, County Administration, and external professional or regulatory partners.";
  if (/library|recreation|golf|grill|veteran|extension|housing/.test(n)) return "County Administration, community organizations, municipalities, state or federal program partners, and contracted providers as applicable.";
  return "County Administration, Office of Management and Budget, Purchasing, Human Resources, Information Technology, and operational partners as needed.";
}

function internalCostFor(d) {
  if (d.fund !== "General Fund") return "Indirect administrative cost allocations are included in Operating where budgeted under the applicable object code.";
  return "No separate indirect administrative charge is assigned to this General Fund presentation; shared support is budgeted centrally.";
}

function whoPaysFor(d) {
  const n = d.name.toLowerCase();
  if (d.fund.includes("Tourist Development")) return [["Overnight visitors", "Tourist Development Tax is paid on eligible short-term lodging stays and supports authorized tourism uses."], ["Residents and day visitors", "They benefit from the service but do not pay this lodging tax unless they purchase a taxable overnight stay."]];
  if (/tourism lifeguard/.test(n)) return [["Overnight visitors", "Tourist Development Tax supports the service agreement; it is collected on eligible short-term lodging stays."]];
  if (/building department/.test(n)) return [["Permit applicants, property owners, contractors and developers", "Building Fund resources originate primarily from permits and development-related service activity; prior resources may also be carried forward."]];
  if (/golf and recreation/.test(n)) return [["Golfers, members and facility users", "Memberships, green fees, cart fees, pool entry and other customer charges support the facility."], ["Residents and visitors", "Intergovernmental or General Fund support covers the portion not recovered from users."]];
  if (/eagle springs grill/.test(n)) return [["Customers and event patrons", "Food, beverage and event purchases support Grill operations."], ["County support", "Any remaining cost is supported through the applicable County fund."]];
  if (/housing/.test(n)) return [["Federal taxpayers", "Federal housing-assistance resources support eligible households and program administration."]];
  if (/engineering|public works/.test(n)) return [["Residents and non-residents purchasing fuel", "Local-option and other fuel taxes support transportation services."], ["Property owners and broader taxpayers", "Property-tax, grant or shared-government support may fund eligible projects and operations."]];
  if (/solid waste/.test(n)) return [["Solid-waste customers and property owners", "Service charges, assessments and other dedicated Solid Waste Fund resources support collection and disposal services."], ["County funds receiving or providing support", "Transfers and indirect administrative allocations retain the payer mix of the originating fund."]];
  if (/mosquito/.test(n)) return [["Property owners in the service area", "Dedicated assessments and special-revenue resources support mosquito-control services."], ["County funds", "Indirect administrative allocations reimburse shared County support where budgeted."]];
  if (/planning|code compliance/.test(n)) return [["Applicants, property owners, businesses and regulated users", "Permits, certificates, service charges and fines are paid when the related activity or service occurs."], ["Property owners and general taxpayers", "General Fund or property-tax support covers services not recovered through fees."]];
  if (/library|recreation/.test(n)) return [["Residents and property owners", "General Fund support provides broad public access."], ["Program and facility users", "Applicable rentals, program fees or service charges are paid only by participating users."]];
  if (d.fund === "General Fund") return [["Residential, commercial and other property owners", "Ad valorem property taxes support the General Fund based on taxable property value."], ["Residents, visitors and businesses", "Sales taxes, shared revenues, fees and other General Fund resources broaden support beyond property tax."]];
  return [["Users and beneficiaries of the dedicated fund", "Fees, restricted taxes, grants or prior fund resources support eligible services."], ["State, federal or other County funding sources", "Shared revenues and transfers retain the payer mix of their originating source."]];
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
    margin-bottom:.13in;
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
  .goal-box{
    padding:.1in .14in;
    background:#f9f8f2;
    border:1px solid #d1be78;
    border-radius:8px;
  }
  .goal-box p{
    margin:0;
    color:#173229;
    font-size:8pt;
    font-weight:700;
    font-style:italic;
    line-height:1.35;
  }
  .achv-box{
    margin-top:.08in;
    padding:.08in .14in;
    background:#003f28;
    border-left:4px solid #e7c95f;
    border-radius:0 8px 8px 0;
    display:flex;
    align-items:baseline;
    gap:.1in;
  }
  .achv-box .achv-star{ color:#e7c95f; font-size:11pt; font-weight:800; line-height:1; flex:0 0 auto; }
  .achv-box div b{ display:block; color:#e7c95f; font-size:6.8pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; margin-bottom:.02in; }
  .achv-box div span{ display:block; color:#e4ede8; font-size:7pt; line-height:1.35; }
  .chal-box{
    margin-top:.08in;
    padding:.08in .14in;
    background:#fbf7f2;
    border-left:4px solid #a24b1e;
    border-radius:0 8px 8px 0;
  }
  .chal-box b{ display:block; color:#a24b1e; font-size:6.6pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; margin-bottom:.02in; }
  .chal-box span{ display:block; color:#33453c; font-size:7pt; line-height:1.35; }
  .svc-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:.14in; margin:0 0 .13in; }
  .svc-card{ padding:.08in .11in; border:1px solid #e4ebe7; border-radius:8px; background:#fbfcfa; }
  .svc-card b{ display:block; color:#003f28; font:800 7.3pt Georgia, serif; margin-bottom:.02in; }
  .svc-card span{ display:block; color:#33453c; font-size:6.7pt; line-height:1.3; }
  .decision-strip{display:grid;grid-template-columns:1fr 1fr;gap:.12in;margin:0 0 .11in}
  .decision-card{padding:.065in .1in;border-left:3px solid #006231;background:#f7f9f7;border-radius:0 6px 6px 0;color:#33453c;font-size:6.35pt;line-height:1.32}
  .decision-card b{display:block;margin-bottom:.015in;color:#003f28;font-size:6.2pt;text-transform:uppercase;letter-spacing:.035em}
  .side-card{
    background:#003f28;
    border-radius:11px;
    padding:.14in .16in;
    color:#fff;
  }
  .side-fund{ color:#e7c95f; font-size:6pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; margin-bottom:.06in; }
  .side-stats{ display:flex; flex-direction:column; gap:.05in; margin-bottom:.08in; }
  .side-stats div{ display:flex; justify-content:space-between; align-items:baseline; gap:.08in; }
  .side-stats div b{ font:800 10pt Georgia, serif; white-space:nowrap; }
  .side-stats div span{ color:#a9c4b3; font-size:5.5pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
  .side-change{ text-align:center; padding:.05in 0; border-top:1px solid rgba(255,255,255,.2); border-bottom:1px solid rgba(255,255,255,.2); margin-bottom:.08in; }
  .side-change b{ font-size:10pt; }
  .side-change.up b{ color:#8fe0b0; }
  .side-change.down b{ color:#f0b090; }
  .side-change span{ display:block; color:#a9c4b3; font-size:5.5pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
  .side-split{ font-size:6.3pt; line-height:1.5; }
  .side-split div{ display:flex; justify-content:space-between; }
  .side-split b{ color:#e7c95f; }
  .internal-cost{margin:.065in 0 0;padding-top:.055in;border-top:1px solid rgba(255,255,255,.2);color:#c7d9cf;font-size:5.45pt;line-height:1.3}
  .qr-wrap{ margin-top:.08in; padding-top:.08in; border-top:1px solid rgba(255,255,255,.2); text-align:center; }
  .qr-wrap img{ width:.8in; height:.8in; background:#fff; border-radius:4px; padding:3px; }
  .qr-wrap span{ display:block; margin-top:.02in; color:#a9c4b3; font-size:5.3pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; }
  .rev-con-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.24in; margin-bottom:.13in; }
  .rev-con-grid.three{ grid-template-columns:1.05fr 1fr 1fr; }
  .rev-box h2, .con-box h2, .cap-box h2{ padding-bottom:.04in; border-bottom:1px solid #003f28; margin-bottom:.05in; }
  .rev-box p{ margin:0; color:#33453c; font-size:7.1pt; line-height:1.42; }
  .payer-row{margin:0 0 .045in;padding-left:.085in;border-left:3px solid #d1be78;color:#33453c;font-size:6.65pt;line-height:1.3}.payer-row b{display:block;color:#003f28;font-size:6.8pt}.source-trace{margin:.055in 0 0;color:#68786f;font-size:5.75pt!important;line-height:1.3!important;font-style:italic}
  .con-list{ margin:0; }
  .con-row{ display:flex; justify-content:space-between; gap:.08in; padding:.03in 0; border-bottom:1px solid #f1f4f1; font-size:6.9pt; }
  .con-row .con-name{ color:#173229; }
  .con-row .con-name em{ display:block; color:#68786f; font-style:normal; font-size:6.2pt; }
  .con-row b{ color:#003f28; white-space:nowrap; }
  .con-note{ margin:.04in 0 0; color:#68786f; font-size:6.3pt; font-style:italic; line-height:1.35; }
  .con-empty{ color:#68786f; font-size:7pt; font-style:italic; }
  .cap-row{ display:flex; justify-content:space-between; gap:.06in; padding:.026in 0; border-bottom:1px solid #f1f4f1; font-size:6.5pt; line-height:1.25; }
  .cap-row.notfunded{ color:#a24b1e; }
  .cap-row span{ color:#173229; }
  .cap-row.notfunded span{ color:#a24b1e; font-style:italic; }
  .cap-row b{ color:#003f28; white-space:nowrap; }
  .cap-row.notfunded b{ color:#a24b1e; }
  .cap-more{ margin:.03in 0 0; color:#68786f; font-size:6.2pt; font-style:italic; }
  .cap-note{ margin:.04in 0 0; color:#68786f; font-size:6.1pt; font-style:italic; line-height:1.32; }
  .pm-section h2{ margin-bottom:.06in; padding-bottom:.04in; border-bottom:1px solid #003f28; }
  .pm-card{
    border:1px solid #e4ebe7;
    border-radius:8px;
    padding:.09in .14in;
    margin-bottom:.08in;
  }
  .pm-card .pm-q{ margin:0 0 .02in; color:#003f28; font-size:8pt; font-weight:700; }
  .pm-card .pm-obj{ margin:0 0 .06in; color:#68786f; font-size:6.9pt; font-style:italic; line-height:1.3; }
  .pm-trend{ display:grid; grid-template-columns:repeat(5,1fr); gap:.06in; }
  .pm-trend div{ text-align:center; padding:.045in 0; border-radius:5px; background:#f4f6f4; }
  .pm-trend div.target{ background:#003f28; }
  .pm-trend div b{ display:block; font:800 8.3pt Georgia, serif; color:#003f28; }
  .pm-trend div.target b{ color:#e7c95f; }
  .pm-trend div span{ display:block; margin-top:.01in; color:#68786f; font-size:5.2pt; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
  .pm-trend div.target span{ color:#a9c4b3; }
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
  .divider{ display:flex; flex-direction:column; justify-content:center; align-items:flex-start; height:100%; padding:0 .8in; }
  .divider .kicker2{ color:#b89521; font-size:11pt; font-weight:900; letter-spacing:.18em; text-transform:uppercase; margin-bottom:.15in; }
  .divider h1b{ color:#ffffff; font:800 46pt/1.05 Georgia, serif; margin:0 0 .3in; }
  .divider p{ color:#cfe0d7; font-size:11pt; line-height:1.6; max-width:5in; }

  /* overview / index */
  .index-list{ column-count:2; column-gap:.4in; }
  .index-row{ break-inside:avoid; display:flex; justify-content:space-between; gap:.1in; padding:.05in 0; border-bottom:1px solid #f1f4f1; font-size:7.8pt; }
  .index-row b{ color:#003f28; }
  .stat-strip{ display:grid; grid-template-columns:repeat(4,1fr); gap:.13in; margin:0 0 .22in; }
  .stat-card{ padding:.13in .1in; border-radius:10px; background:#003f28; text-align:center; }
  .stat-card b{ display:block; color:#fff; font:800 13pt/1.1 Georgia, serif; }
  .stat-card span{ display:block; margin-top:.03in; color:#e7c95f; font-size:6.2pt; font-weight:800; letter-spacing:.02em; text-transform:uppercase; line-height:1.25; }
`;

async function buildDeptPage(d, pageNumber) {
  const fy27 = d.personnel + d.contractual + d.operating + d.capital + (d.other || 0);
  const deltaTotal = d.deltaP + d.deltaO + d.deltaC;
  const fy26 = fy27 - deltaTotal;
  const isDown = deltaTotal < 0;
  const dsign = deltaTotal >= 0 ? "+" : "−";
  const payerHtml = whoPaysFor(d).map(([payer, explanation]) => `<div class="payer-row"><b>${payer}</b>${explanation}</div>`).join("");

  let qrHtml = "";
  if (d.video) {
    const url = `https://www.youtube.com/watch?v=${d.video}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 0, width: 200, color: { dark: "#003f28", light: "#ffffff" } });
    qrHtml = `<div class="qr-wrap"><img src="${dataUrl}" alt="QR"/><span>Watch Video</span></div>`;
  }

  const pmHtml = d.pms.map((pm) => `
    <div class="pm-card">
      <p class="pm-q">${pm.q}</p>
      <p class="pm-obj">${pm.obj}</p>
      <div class="pm-trend">
        <div><b>${pm.y[0]}</b><span>2022</span></div>
        <div><b>${pm.y[1]}</b><span>2023</span></div>
        <div><b>${pm.y[2]}</b><span>2024</span></div>
        <div><b>${pm.y[3]}</b><span>2025</span></div>
        <div class="target"><b>${pm.target}</b><span>FY27 Target</span></div>
      </div>
    </div>`).join("");

  const conHtml = d.contracts.length
    ? `<div class="con-list">${d.contracts.map((c) => `<div class="con-row"><div class="con-name">${c.service}<em>${c.provider}${c.separate ? " &mdash; tracked separately" : ""}</em></div><b>${money(c.amount)}</b></div>`).join("")}</div>${d.contractsNote ? `<p class="con-note">${d.contractsNote}</p>` : ""}`
    : `<p class="con-empty">No contracted services identified for this office.</p>`;

  const capItems = d.capitalItems || [];
  const MAX_CAP_ROWS = 5;
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
    if (d.capitalNote) capHtml += `<p class="cap-note">${d.capitalNote}</p>`;
  }

  const footnoteHtml = d.footnote ? `<p class="footnote">†Figures shown are this office's own reported costs. Summed across all Environmental Services programs, this does not exactly reach the Environmental Services department total in the Department Operating Ledger — that total includes additional cost categories not broken out at the individual program level.</p>` : "";

  return `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">${d.entityType || "Departments"}${d.footnote ? "†" : ""}</small>
    <h1>${d.name}</h1>
    <div class="top-grid">
      <div>
        <h2>Statement of Function</h2>
        <p class="sof">${d.sof}</p>
        ${d.goal ? `<h2>Department Goal</h2><div class="goal-box"><p>${d.goal}</p></div>` : ""}
        ${d.achievement ? `<div class="achv-box"><span class="achv-star">&#9733;</span><div><b>${d.achievement.label}</b><span>${d.achievement.detail}</span></div></div>` : ""}
        ${d.challenges ? `<div class="chal-box"><b>Challenges</b><span>${d.challenges}</span></div>` : ""}
      </div>
      <div class="side-card">
        <div class="side-fund">${d.fund}</div>
        <div class="side-stats">
          <div><b>${money(fy26)}</b><span>FY2026 Total</span></div>
          <div><b>${money(fy27)}</b><span>FY2027 Total</span></div>
        </div>
        <div class="side-change ${isDown ? "down" : "up"}">
          <b>${dsign}${money(Math.abs(deltaTotal)).slice(1)}</b>
          <span>${pct(deltaTotal, fy26)} &middot; ${d.fte} FTE</span>
        </div>
        <div class="side-split">
          <div><span>Personnel</span><b>${money(d.personnel)}</b></div>
          <div><span>Contractual</span><b>${money(d.contractual)}</b></div>
          <div><span>Operating</span><b>${money(d.operating)}</b></div>
          <div><span>Capital</span><b>${money(d.capital)}</b></div>
        </div>
        <p class="internal-cost"><b>Internal costs:</b> ${internalCostFor(d)}</p>
        ${d.changeNote ? `<p style="margin:.06in 0 0;color:#a9c4b3;font-size:6pt;line-height:1.35;">Primary change: ${d.changeNote}</p>` : ""}
        ${qrHtml}
      </div>
    </div>
    <h2>Core Services</h2><div class="svc-grid">${(d.services || [["Primary service", d.sof.split(".")[0] + "."]]).map(([t, desc]) => `<div class="svc-card"><b>${t}</b><span>${desc}</span></div>`).join("")}</div>
    <div class="decision-strip"><div class="decision-card"><b>FY2027 Service-Level Change</b>${serviceChangeFor(d)}</div><div class="decision-card"><b>Delivery Partners</b>${partnersFor(d)}</div></div>
    <div class="rev-con-grid three">
      <div class="rev-box"><h2>Who Pays</h2>${payerHtml}<p class="source-trace">Accounting sources: ${d.revenue}</p></div>
      <div class="con-box"><h2>Contracts</h2>${conHtml}</div>
      <div class="cap-box"><h2>Capital Requests &mdash; FY2027</h2>${capItems.length ? capHtml : (d.capital ? `<p class="con-empty">${money(d.capital)} is budgeted as capital; no itemized request list was available.</p>` : `<p class="con-empty">No FY2027 capital requests.</p>`)}</div>
    </div>
    ${d.pms.length ? `<div class="pm-section"><h2>Performance Measures</h2>${pmHtml}</div>` : `<div class="pm-section"><h2>Contract Accountability</h2><p class="con-empty">No verified performance series was available for publication. Contract monitoring should report coverage, preventive actions, rescues, response activity, staffing readiness, and material service variances.</p></div>`}
    ${footnoteHtml}
    <footer><span>FY 2027 Tentative Budget</span><b>${pageNumber}</b></footer>
  </section>`;
}

const startPage = Number(process.argv[3] || 27);

async function main() {
  let pageCounter = startPage;

  const dividerHtml = `
  <section style="background:#003f28;padding:0;">
    <div class="divider">
      <span class="kicker2">Budget Book Guide</span>
      <h1b>Departments<br/>and Services</h1b>
      <p>A statement of function, department goal, services, challenges, funding sources, contracts, and performance measures for each of Walton County's ${DEPARTMENTS.length} Board department offices and programs.</p>
    </div>
  </section>`;

  const totalFy27 = DEPARTMENTS.reduce((s, d) => s + d.personnel + d.contractual + d.operating + d.capital + (d.other || 0), 0);
  const totalFte = DEPARTMENTS.reduce((s, d) => s + d.fte, 0);
  const withVideo = DEPARTMENTS.filter((d) => d.video).length;

  const overviewHtml = `
  <section>
    <header><span>Walton County, Florida</span><em>Fiscal Year 2027</em></header>
    <small class="kicker">Departments</small>
    <h1 style="border-bottom:none;padding-bottom:0;">Departments and Services</h1>
    <p class="sof">Each of the following ${DEPARTMENTS.length} pages presents one Board department office or program in full: its statement of function, department goal, services and challenges, funding sources, contracted services, budget by category (Personnel, Contractual, Operating, Capital), staffing, and verified performance measures where available. Where an office has a public video overview, a QR code links to it. Tourism Administration and Beach Operations are presented at the office level to match the online explorer hierarchy.</p>
    <div class="stat-strip">
      <div class="stat-card"><b>${DEPARTMENTS.length}</b><span>Offices Profiled</span></div>
      <div class="stat-card"><b>${money(totalFy27)}</b><span>Combined FY2027 Budget</span></div>
      <div class="stat-card"><b>${totalFte}</b><span>Combined FTE</span></div>
      <div class="stat-card"><b>${withVideo}</b><span>Offices With a Video</span></div>
    </div>
    <h2 style="margin-top:.1in;">Offices in This Chapter</h2>
    <div class="index-list">
      ${DEPARTMENTS.map((d) => `<div class="index-row"><span>${d.name}</span><b>${money(d.personnel + d.contractual + d.operating + d.capital + (d.other || 0))}</b></div>`).join("")}
    </div>
    <footer><span>FY 2027 Annual Budget</span><b>${pageCounter}</b></footer>
  </section>`;
  pageCounter++;

  const deptPages = [];
  for (const d of DEPARTMENTS) {
    deptPages.push(await buildDeptPage(d, pageCounter));
    pageCounter++;
  }

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Departments and Services</title>
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
