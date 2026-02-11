-- ============================================================================
-- ASSIGN PARTICIPANTS TO TEAMS
-- Depends on: teams, participants
-- ============================================================================

-- AI Agents teams (3-4 members each, some solo participants remain unassigned)
UPDATE hackathon_participants SET team_id = '20012001-2001-2001-2001-200120012001' WHERE id IN ('10011001-1001-1001-1001-100110011001', '10021002-1002-1002-1002-100210021002', '10031003-1003-1003-1003-100310031003');
UPDATE hackathon_participants SET team_id = '20022002-2002-2002-2002-200220022002' WHERE id IN ('10041004-1004-1004-1004-100410041004', '10051005-1005-1005-1005-100510051005', '10061006-1006-1006-1006-100610061006');
UPDATE hackathon_participants SET team_id = '20032003-2003-2003-2003-200320032003' WHERE id IN ('10071007-1007-1007-1007-100710071007', '10081008-1008-1008-1008-100810081008', '10091009-1009-1009-1009-100910091009');
UPDATE hackathon_participants SET team_id = '20042004-2004-2004-2004-200420042004' WHERE id IN ('100a100a-100a-100a-100a-100a100a100a', '100b100b-100b-100b-100b-100b100b100b', '100c100c-100c-100c-100c-100c100c100c', '100d100d-100d-100d-100d-100d100d100d');
UPDATE hackathon_participants SET team_id = '20052005-2005-2005-2005-200520052005' WHERE id IN ('100e100e-100e-100e-100e-100e100e100e', '100f100f-100f-100f-100f-100f100f100f', '10101010-1010-1010-1010-101010101010');
UPDATE hackathon_participants SET team_id = '20062006-2006-2006-2006-200620062006' WHERE id IN ('10111011-1011-1011-1011-101110111011', '10121012-1012-1012-1012-101210121012', '10131013-1013-1013-1013-101310131013', '10141014-1014-1014-1014-101410141014');
UPDATE hackathon_participants SET team_id = '20072007-2007-2007-2007-200720072007' WHERE id IN ('10151015-1015-1015-1015-101510151015', '10161016-1016-1016-1016-101610161016', '10171017-1017-1017-1017-101710171017');
-- Participants 10181018..10191019 remain solo

-- Search & Discovery teams (2-3 members each, some solo)
UPDATE hackathon_participants SET team_id = '20082008-2008-2008-2008-200820082008' WHERE id IN ('101a101a-101a-101a-101a-101a101a101a', '101b101b-101b-101b-101b-101b101b101b', '101c101c-101c-101c-101c-101c101c101c');
UPDATE hackathon_participants SET team_id = '20092009-2009-2009-2009-200920092009' WHERE id IN ('101d101d-101d-101d-101d-101d101d101d', '101e101e-101e-101e-101e-101e101e101e', '101f101f-101f-101f-101f-101f101f101f');
UPDATE hackathon_participants SET team_id = '200a200a-200a-200a-200a-200a200a200a' WHERE id IN ('10201020-1020-1020-1020-102010201020', '10211021-1021-1021-1021-102110211021');
UPDATE hackathon_participants SET team_id = '200b200b-200b-200b-200b-200b200b200b' WHERE id IN ('10221022-1022-1022-1022-102210221022', '10231023-1023-1023-1023-102310231023', '10241024-1024-1024-1024-102410241024');
-- Participants 10251025..10281028 remain solo

-- AI Art teams (2-3 members each, some solo)
UPDATE hackathon_participants SET team_id = '200c200c-200c-200c-200c-200c200c200c' WHERE id IN ('10291029-1029-1029-1029-102910291029', '102a102a-102a-102a-102a-102a102a102a', '102b102b-102b-102b-102b-102b102b102b');
UPDATE hackathon_participants SET team_id = '200d200d-200d-200d-200d-200d200d200d' WHERE id IN ('102c102c-102c-102c-102c-102c102c102c', '102d102d-102d-102d-102d-102d102d102d', '102e102e-102e-102e-102e-102e102e102e');
UPDATE hackathon_participants SET team_id = '200e200e-200e-200e-200e-200e200e200e' WHERE id IN ('102f102f-102f-102f-102f-102f102f102f', '10301030-1030-1030-1030-103010301030', '10311031-1031-1031-1031-103110311031');
UPDATE hackathon_participants SET team_id = '200f200f-200f-200f-200f-200f200f200f' WHERE id IN ('10321032-1032-1032-1032-103210321032', '10331033-1033-1033-1033-103310331033');
UPDATE hackathon_participants SET team_id = '20102010-2010-2010-2010-201020102010' WHERE id IN ('10361036-1036-1036-1036-103610361036', '10371037-1037-1037-1037-103710371037');
-- Participants 10341034..10351035, 10381038..103a103a remain solo

-- ============================================================================
-- AGI HOUSE TEAM ASSIGNMENTS
-- ============================================================================

-- MCP Agents teams (3 members each, remaining are solo)
UPDATE hackathon_participants SET team_id = 'a9f00001-a9f0-a9f0-a9f0-a9f00001a9f0' WHERE id IN ('a9e00001-a9e0-a9e0-a9e0-a9e00001a9e0', 'a9e00002-a9e0-a9e0-a9e0-a9e00002a9e0', 'a9e00003-a9e0-a9e0-a9e0-a9e00003a9e0');
UPDATE hackathon_participants SET team_id = 'a9f00002-a9f0-a9f0-a9f0-a9f00002a9f0' WHERE id IN ('a9e00004-a9e0-a9e0-a9e0-a9e00004a9e0', 'a9e00005-a9e0-a9e0-a9e0-a9e00005a9e0', 'a9e00006-a9e0-a9e0-a9e0-a9e00006a9e0');
UPDATE hackathon_participants SET team_id = 'a9f00003-a9f0-a9f0-a9f0-a9f00003a9f0' WHERE id IN ('a9e00007-a9e0-a9e0-a9e0-a9e00007a9e0', 'a9e00008-a9e0-a9e0-a9e0-a9e00008a9e0', 'a9e00009-a9e0-a9e0-a9e0-a9e00009a9e0');
UPDATE hackathon_participants SET team_id = 'a9f00004-a9f0-a9f0-a9f0-a9f00004a9f0' WHERE id IN ('a9e0000a-a9e0-a9e0-a9e0-a9e0000aa9e0', 'a9e0000b-a9e0-a9e0-a9e0-a9e0000ba9e0', 'a9e0000c-a9e0-a9e0-a9e0-a9e0000ca9e0', 'a9e0000d-a9e0-a9e0-a9e0-a9e0000da9e0');
UPDATE hackathon_participants SET team_id = 'a9f00005-a9f0-a9f0-a9f0-a9f00005a9f0' WHERE id IN ('a9e0000e-a9e0-a9e0-a9e0-a9e0000ea9e0', 'a9e0000f-a9e0-a9e0-a9e0-a9e0000fa9e0', 'a9e00010-a9e0-a9e0-a9e0-a9e00010a9e0');
-- Participants a9e00011..a9e00014 remain solo

-- GenAI Goes Local teams (3 members each, remaining are solo)
UPDATE hackathon_participants SET team_id = 'a9f00006-a9f0-a9f0-a9f0-a9f00006a9f0' WHERE id IN ('a9e00015-a9e0-a9e0-a9e0-a9e00015a9e0', 'a9e00016-a9e0-a9e0-a9e0-a9e00016a9e0', 'a9e00017-a9e0-a9e0-a9e0-a9e00017a9e0');
UPDATE hackathon_participants SET team_id = 'a9f00007-a9f0-a9f0-a9f0-a9f00007a9f0' WHERE id IN ('a9e00018-a9e0-a9e0-a9e0-a9e00018a9e0', 'a9e00019-a9e0-a9e0-a9e0-a9e00019a9e0', 'a9e0001a-a9e0-a9e0-a9e0-a9e0001aa9e0');
UPDATE hackathon_participants SET team_id = 'a9f00008-a9f0-a9f0-a9f0-a9f00008a9f0' WHERE id IN ('a9e0001b-a9e0-a9e0-a9e0-a9e0001ba9e0', 'a9e0001c-a9e0-a9e0-a9e0-a9e0001ca9e0', 'a9e0001d-a9e0-a9e0-a9e0-a9e0001da9e0');
UPDATE hackathon_participants SET team_id = 'a9f00009-a9f0-a9f0-a9f0-a9f00009a9f0' WHERE id IN ('a9e0001e-a9e0-a9e0-a9e0-a9e0001ea9e0', 'a9e0001f-a9e0-a9e0-a9e0-a9e0001fa9e0', 'a9e00020-a9e0-a9e0-a9e0-a9e00020a9e0');
-- Participants a9e00021..a9e00023 remain solo

-- Generative UI teams (3 members each, remaining are solo)
UPDATE hackathon_participants SET team_id = 'a9f0000a-a9f0-a9f0-a9f0-a9f0000aa9f0' WHERE id IN ('a9e00025-a9e0-a9e0-a9e0-a9e00025a9e0', 'a9e00026-a9e0-a9e0-a9e0-a9e00026a9e0', 'a9e00027-a9e0-a9e0-a9e0-a9e00027a9e0');
UPDATE hackathon_participants SET team_id = 'a9f0000b-a9f0-a9f0-a9f0-a9f0000ba9f0' WHERE id IN ('a9e00028-a9e0-a9e0-a9e0-a9e00028a9e0', 'a9e00029-a9e0-a9e0-a9e0-a9e00029a9e0', 'a9e0002a-a9e0-a9e0-a9e0-a9e0002aa9e0');
UPDATE hackathon_participants SET team_id = 'a9f0000c-a9f0-a9f0-a9f0-a9f0000ca9f0' WHERE id IN ('a9e0002b-a9e0-a9e0-a9e0-a9e0002ba9e0', 'a9e0002c-a9e0-a9e0-a9e0-a9e0002ca9e0', 'a9e0002d-a9e0-a9e0-a9e0-a9e0002da9e0');
UPDATE hackathon_participants SET team_id = 'a9f0000d-a9f0-a9f0-a9f0-a9f0000da9f0' WHERE id IN ('a9e0002e-a9e0-a9e0-a9e0-a9e0002ea9e0', 'a9e0002f-a9e0-a9e0-a9e0-a9e0002fa9e0', 'a9e00030-a9e0-a9e0-a9e0-a9e00030a9e0');
UPDATE hackathon_participants SET team_id = 'a9f0000e-a9f0-a9f0-a9f0-a9f0000ea9f0' WHERE id IN ('a9e00031-a9e0-a9e0-a9e0-a9e00031a9e0', 'a9e00032-a9e0-a9e0-a9e0-a9e00032a9e0');
-- Dev user (a9e00024) and participants a9e00033..a9e00036 remain solo
