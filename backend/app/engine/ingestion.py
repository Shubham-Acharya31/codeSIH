import json
from pathlib import Path
from typing import List, Dict, Any, Union
from pydantic import ValidationError
from backend.app.models.shipment import Shipment

class IngestionError(Exception):
    """Raised when shipment ingestion or parsing fails."""
    pass

def ingest_shipment(data: Dict[str, Any]) -> Shipment:
    """
    Ingest and validate a single shipment dictionary into a Pydantic Shipment model.
    """
    if not isinstance(data, dict):
        raise IngestionError(f"Expected dictionary payload for shipment, got {type(data)}")
    try:
        return Shipment(**data)
    except (ValidationError, TypeError, ValueError) as e:
        raise IngestionError(f"Failed to ingest shipment record {data.get('shipment_id', 'UNKNOWN')}: {str(e)}") from e

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
