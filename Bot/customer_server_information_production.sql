-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 02, 2024 at 08:17 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `customer_server_information_production`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `Check_If_Server_Exists` (IN `guild_id` VARCHAR(35), OUT `exists_flag` BOOLEAN)   IF (SELECT 1 FROM server_information WHERE discord_server_id = guild_id) THEN
        SET exists_flag = FALSE;
    ELSE
        SET exists_flag = TRUE;
END IF$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `Delete_Server_Information` (IN `guildID` VARCHAR(35))   DELETE FROM server_information WHERE discord_server_id = guildID$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `Get_Server_Information` (IN `discord_server_id_IN` VARCHAR(35))   SELECT * FROM server_information WHERE discord_server_id = discord_server_id_IN$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `Save_Server_Information` (IN `discord_server_id_IN` VARCHAR(35), IN `ticket_system_channel_id_IN` VARCHAR(35), IN `ticket_category_id_IN` VARCHAR(35), IN `support_role_id_IN` VARCHAR(35), IN `kiadmin_role_id_IN` VARCHAR(35))   INSERT INTO server_information (discord_server_id, ticket_system_channel_id, ticket_category_id,support_role_id,  	kiadmin_role_id )
VALUES (discord_server_id_IN,ticket_system_channel_id_IN, ticket_category_id_IN, support_role_id_IN, 	kiadmin_role_id_IN)$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `server_information`
--

CREATE TABLE `server_information` (
  `ID` int(11) NOT NULL,
  `discord_server_id` varchar(35) NOT NULL,
  `ticket_system_channel_id` varchar(35) NOT NULL,
  `ticket_category_id` varchar(35) NOT NULL,
  `support_role_id` varchar(35) NOT NULL,
  `kiadmin_role_id` varchar(35) NOT NULL,
  `hex_color` varchar(7) NOT NULL DEFAULT '#6B8F71'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `server_information`
--
ALTER TABLE `server_information`
  ADD PRIMARY KEY (`ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `server_information`
--
ALTER TABLE `server_information`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
