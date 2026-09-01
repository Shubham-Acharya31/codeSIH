import json
from pathlib import Path
from typing import List, Dict, Any, Union
from pydantic import ValidationError
from backend.app.models.shipment import Shipment
from backend.app.core.exceptions import FreightAppException

class IngestionError(FreightAppException):
    """Raised when shipment ingestion or parsing fails."""
    status_code: int = 400
    message: str = "Shipment record ingestion or parsing failed."

def ingest_shipment(data: Dict[str, Any]) -> Shipment:
    """
    Ingest and validate a single shipment dictionary into a Pydantic Shipment model.
    """
    if not isinstance(data, dict):
        raise IngestionError(f"Expected dictionary payload for shipment, got {type(data).__name__}")
    try:
        return Shipment(**data)
    except (ValidationError, TypeError, ValueError) as e:
        record_id = data.get("shipment_id", "UNKNOWN") if isinstance(data, dict) else "UNKNOWN"
        raise IngestionError(f"Failed to ingest shipment record {record_id}: {str(e)}") from e

def ingest_shipments(data_list: List[Dict[str, Any]]) -> List[Shipment]:
    """
    Ingest and validate a batch of shipment dictionaries.
    """
    if not data_list or not isinstance(data_list, list):
        raise IngestionError("Shipment ingestion batch cannot be empty.")
    
    shipments = []
    for item in data_list:
        shipments.append(ingest_shipment(item))
    return shipments
