import React from "react";

const cardStyle = {
    width: "5em",
    height: "7em",
    boxShadow: "0 0.0625em 0.125em rgba(0, 0, 0, 0.15)",
    borderRadius: "0.5em",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#131313",
    color: "white",
    margin: "5px"
}
const Card = ({ value, ...props }) => {
    return (
        <div {...props} style={cardStyle}><h1>{value}</h1></div>
    )
}
export default Card;